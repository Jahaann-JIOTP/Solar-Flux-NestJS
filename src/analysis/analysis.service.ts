import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FinalFormatRecord } from "./schemas/final_format.schema";
import { AggregateDataDto, AttributeType, ResolutionType } from "./dto/aggregate-data.dto";
import { StringHourlyRecord } from "./schemas/string_hourly.schema";
import { StringDay } from "./schemas/sting_day.schema";

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(FinalFormatRecord.name)
    private readonly finalFormatModel: Model<FinalFormatRecord>,

    @InjectModel(StringHourlyRecord.name) // Inject the String_hourly model
    private readonly stringHourlyModel: Model<StringHourlyRecord>,

    @InjectModel(StringDay.name) // Inject the String_hourly model
    private readonly stringDayModel: Model<StringDay>
  ) {}

  async aggregateData(payload: AggregateDataDto): Promise<any> {
    const { start_date, end_date, plant, inverter, mppt, attribute, resolution } = payload;
    if (!start_date || !end_date) {
      throw new BadRequestException("start_date and end_date are required.");
    }

    const startDateObj = `${start_date} 00:00:00`;
    const endDateObj = `${end_date} 23:59:59`;

    // ✅ Define Base Query
    const query: any = {
      timestamp: { $gte: startDateObj, $lte: endDateObj }
    };

    if (plant) query["Plant"] = plant;
    if (inverter) query["sn"] = inverter;
    if (mppt) query["MPPT"] = mppt;

      // ✅ MPPT Filter (Ensure valid MPPT values)
  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

    // ✅ Define Attribute Mapping
    let selectedAttribute: any = "$u"; // Default: Voltage
    if (attribute === AttributeType.Current) selectedAttribute = "$i";
    if (attribute === AttributeType.Power) selectedAttribute = { $multiply: ["$u", "$i"] }; // Only for 5min resolution

    let pipeline: any[] = [];

    // ✅ **Logic for Resolution Selection**

    // ✅ Case 1: `5min` Resolution (Keep existing logic, Fetch from `final_format`)
    if (resolution === ResolutionType.FiveMin) {
      // ✅ Case 1: Plant, Inverter, and MPPT are selected
      if (plant && inverter && mppt) {
        pipeline = [
          { $match: { ...query, ...mpptFilter } },
          {
            $group: {
              _id: {
                timestamp: "$timestamp",
                Strings: "$Strings",
                Plant: plant,
                sn: inverter,
                mppt: mppt
              },
              value1: { $avg: selectedAttribute }
            }
          },
          {
            $group: {
              _id: "$_id.timestamp",
              values: {
                $push: {
                  Strings: "$_id.Strings",
                  value1: "$value1",
                  Plant: "$_id.Plant",
                  sn: "$_id.sn",
                  mppt: "$_id.mppt"
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ];
      }
    
      // ✅ Case 2: Plant and Inverter are selected, MPPT is NOT
      else if (plant && inverter && !mppt) {
        pipeline = [
          { $match: { ...query, ...mpptFilter } },
          {
            $group: {
              _id: {
                timestamp: "$timestamp",
                mppt: "$MPPT",
                plant: plant,
                sn: inverter
              },
              value1: { $avg: selectedAttribute }
            }
          },
          {
            $group: {
              _id: "$_id.timestamp",
              values: {
                $push: {
                  sn: "$_id.sn",
                  value1: "$value1",
                  mppt: "$_id.mppt",
                  Plant: "$_id.plant"
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ];
      }
    
      // ✅ Case 3: Only Plant is selected
      else {
        pipeline = [
          { $match: { ...query, ...mpptFilter } },
          {
            $group: {
              _id: {
                timestamp: "$timestamp",
                sn: "$sn"
              },
              value1: { $avg: selectedAttribute }
            }
          },
          {
            $group: {
              _id: "$_id.timestamp",
              values: {
                $push: {
                  sn: "$_id.sn",
                  value1: "$value1"
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ];
      }
    
      // ✅ Run aggregation
      const results = await this.finalFormatModel.aggregate(pipeline);
      return this.formatOutput(results, startDateObj, plant, inverter, mppt);
    }
    

// ✅ Case 2: `hourly` Resolution (Fetch from `String_hourly`)
if (resolution === ResolutionType.Hourly) {
  let selectedHourlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedHourlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedHourlyAttribute = "$P_abd";

  // Base query
  const query: any = {
    Day_Hour: {
      $gte: `${start_date} 00`,
      $lte: `${end_date} 23`
    }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  // ✅ Case 1: Plant, Inverter, and MPPT are selected
  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day_Hour",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: { $avg: selectedHourlyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  // ✅ Case 2: Plant and Inverter are selected, but MPPT is not
  else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day_Hour",
            mppt: "$MPPT",
            Plant: plant,
            sn: inverter
          },
          value1: { $avg: selectedHourlyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  // ✅ Case 3: Only Plant is selected
  else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day_Hour",
            sn: "$sn"
          },
          value1: { $avg: selectedHourlyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  // ✅ Run Query on `String_hourly`
  const results = await this.stringHourlyModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}


    // ✅ Case 3: `daily` Resolution (Fetch from `String_Day`)
// ✅ Case 3: `daily` Resolution (Fetch from `String_Day`)
if (resolution === ResolutionType.Daily) {
  let selectedDailyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedDailyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedDailyAttribute = "$P_abd";

  const query: any = {
    Day: {
      $gte: start_date,
      $lte: end_date
    }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  // ✅ Case 1: Plant, Inverter, and MPPT are selected
  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: { $avg: selectedDailyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  // ✅ Case 2: Plant and Inverter are selected, but MPPT is not
  else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day",
            mppt: "$MPPT",
            Plant: plant,
            sn: inverter
          },
          value1: { $avg: selectedDailyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  // ✅ Case 3: Only Plant is selected
  else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $group: {
          _id: {
            timestamp: "$Day",
            sn: "$sn"
          },
          value1: { $avg: selectedDailyAttribute }
        }
      },
      {
        $group: {
          _id: "$_id.timestamp",
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}



// ✅ Case 4: Weekly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Weekly) {
  let selectedWeeklyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedWeeklyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedWeeklyAttribute = "$P_abd";

  const query: any = {
    Day: { $gte: start_date, $lte: end_date }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  // ✅ Case 1: Plant, Inverter, and MPPT are selected
  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          week: { $week: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            week: "$week",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedWeeklyAttribute }
            : { $avg: selectedWeeklyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", week: "$_id.week" },
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ];
  }

  // ✅ Case 2: Plant and Inverter are selected, but MPPT is not
  else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          week: { $week: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            week: "$week",
            Plant: plant,
            sn: inverter,
            mppt: "$MPPT"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedWeeklyAttribute }
            : { $avg: selectedWeeklyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", week: "$_id.week" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ];
  }

  // ✅ Case 3: Only Plant is selected
  else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          week: { $week: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            week: "$week",
            sn: "$sn"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedWeeklyAttribute }
            : { $avg: selectedWeeklyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", week: "$_id.week" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}



// ✅ Case 5: Monthly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Monthly) {
  let selectedMonthlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedMonthlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedMonthlyAttribute = "$P_abd";

  const query: any = {
    Day: { $gte: start_date, $lte: end_date }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  // ✅ Case 1: Plant, Inverter, and MPPT are selected
  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          month: { $month: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedMonthlyAttribute }
            : { $avg: selectedMonthlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];
  }

  // ✅ Case 2: Plant and Inverter are selected, but MPPT is not
  else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          month: { $month: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            Plant: plant,
            sn: inverter,
            mppt: "$MPPT"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedMonthlyAttribute }
            : { $avg: selectedMonthlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];
  }

  // ✅ Case 3: Only Plant is selected
  else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          month: { $month: "$fullDate" },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            sn: "$sn"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedMonthlyAttribute }
            : { $avg: selectedMonthlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}



// ✅ Case 6: Quarterly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Quarter) {
  let selectedQuarterlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedQuarterlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedQuarterlyAttribute = "$P_abd";

  const query: any = {
    Day: { $gte: start_date, $lte: end_date }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  // ✅ Case 1: Plant, Inverter, and MPPT are selected
  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: "$fullDate" }, 3] }, then: 1 },
                { case: { $lte: [{ $month: "$fullDate" }, 6] }, then: 2 },
                { case: { $lte: [{ $month: "$fullDate" }, 9] }, then: 3 },
                { case: { $lte: [{ $month: "$fullDate" }, 12] }, then: 4 }
              ],
              default: null
            }
          },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            quarter: "$quarter",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedQuarterlyAttribute }
            : { $avg: selectedQuarterlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", quarter: "$_id.quarter" },
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.quarter": 1 } }
    ];
  }

  // ✅ Case 2: Plant and Inverter are selected, but MPPT is not
  else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: "$fullDate" }, 3] }, then: 1 },
                { case: { $lte: [{ $month: "$fullDate" }, 6] }, then: 2 },
                { case: { $lte: [{ $month: "$fullDate" }, 9] }, then: 3 },
                { case: { $lte: [{ $month: "$fullDate" }, 12] }, then: 4 }
              ],
              default: null
            }
          },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            quarter: "$quarter",
            Plant: plant,
            sn: inverter,
            mppt: "$MPPT"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedQuarterlyAttribute }
            : { $avg: selectedQuarterlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", quarter: "$_id.quarter" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.quarter": 1 } }
    ];
  }

  // ✅ Case 3: Only Plant is selected
  else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } }
        }
      },
      {
        $addFields: {
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: "$fullDate" }, 3] }, then: 1 },
                { case: { $lte: [{ $month: "$fullDate" }, 6] }, then: 2 },
                { case: { $lte: [{ $month: "$fullDate" }, 9] }, then: 3 },
                { case: { $lte: [{ $month: "$fullDate" }, 12] }, then: 4 }
              ],
              default: null
            }
          },
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            quarter: "$quarter",
            sn: "$sn"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedQuarterlyAttribute }
            : { $avg: selectedQuarterlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", quarter: "$_id.quarter" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.quarter": 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}


// ✅ Case 7: Half-Yearly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.HalfYearly) {
  let selectedHalfYearlyAttribute: any = "$u";
  if (attribute === AttributeType.Current) selectedHalfYearlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedHalfYearlyAttribute = "$P_abd";

  const query: any = {
    Day: { $gte: start_date, $lte: end_date }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" },
          half: {
            $cond: [
              { $lte: [{ $month: "$fullDate" }, 6] },
              1,
              2
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            half: "$half",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedHalfYearlyAttribute }
            : { $avg: selectedHalfYearlyAttribute }
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            half: "$_id.half"
          },
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.half": 1 } }
    ];
  } else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" },
          half: {
            $cond: [
              { $lte: [{ $month: "$fullDate" }, 6] },
              1,
              2
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            half: "$half",
            Plant: plant,
            sn: inverter,
            mppt: "$MPPT"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedHalfYearlyAttribute }
            : { $avg: selectedHalfYearlyAttribute }
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            half: "$_id.half"
          },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.half": 1 } }
    ];
  } else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" },
          half: {
            $cond: [
              { $lte: [{ $month: "$fullDate" }, 6] },
              1,
              2
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            half: "$half",
            sn: "$sn"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedHalfYearlyAttribute }
            : { $avg: selectedHalfYearlyAttribute }
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            half: "$_id.half"
          },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.half": 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}


// ✅ Case 8:Yearly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Yearly) {
  let selectedYearlyAttribute: any = "$u";
  if (attribute === AttributeType.Current) selectedYearlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedYearlyAttribute = "$P_abd";

  const query: any = {
    Day: {
      $gte: start_date,
      $lte: end_date
    }
  };
  if (plant) query["Plant"] = plant;
  if (inverter) query["sn"] = inverter;
  if (mppt) query["MPPT"] = mppt;

  const mpptFilter = {
    $expr: {
      $and: [
        { $ne: ["$MPPT", null] },
        { $ne: ["$MPPT", NaN] }
      ]
    }
  };

  if (plant && inverter && mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            Strings: "$Strings",
            Plant: plant,
            sn: inverter,
            mppt: mppt
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedYearlyAttribute }
            : { $avg: selectedYearlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year" },
          values: {
            $push: {
              Strings: "$_id.Strings",
              value1: "$value1",
              Plant: "$_id.Plant",
              sn: "$_id.sn",
              mppt: "$_id.mppt"
            }
          }
        }
      },
      { $sort: { "_id.year": 1 } }
    ];
  } else if (plant && inverter && !mppt) {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            Plant: plant,
            sn: inverter,
            mppt: "$MPPT"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedYearlyAttribute }
            : { $avg: selectedYearlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1",
              mppt: "$_id.mppt",
              Plant: "$_id.Plant"
            }
          }
        }
      },
      { $sort: { "_id.year": 1 } }
    ];
  } else {
    pipeline = [
      { $match: { ...query, ...mpptFilter } },
      {
        $addFields: {
          fullDate: {
            $dateFromString: {
              dateString: "$Day",
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $addFields: {
          year: { $year: "$fullDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            sn: "$sn"
          },
          value1: attribute === AttributeType.Power
            ? { $sum: selectedYearlyAttribute }
            : { $avg: selectedYearlyAttribute }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year" },
          values: {
            $push: {
              sn: "$_id.sn",
              value1: "$value1"
            }
          }
        }
      },
      { $sort: { "_id.year": 1 } }
    ];
  }

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj, plant, inverter, mppt);
}

   
    throw new BadRequestException("Invalid resolution. Allowed values: 5min, hourly.");
  }

  // ✅ **Format Output Function (Reused for Both Resolutions)**
  private formatOutput(
    results: any[],
    startDateStr: string,
    plant?: string,
    inverter?: string,
    mppt?: string
  ) {
    const output: { timestamp: string; values: { sn: string; value1: number; Strings: string; Plant: string; mppt: string }[] }[] = [];
  
    if (results.length) {
      for (const result of results) {
        const timestamp = result._id;
        const values = result.values || [];
  
        const formattedValues = values.map((value: any) => ({
          sn: plant && inverter && mppt
            ? value.Strings
            : plant && inverter
            ? value.mppt
            : value.sn,
          value1: value.value1,
          Strings: value.Strings || "",
          Plant: value.Plant || "",
          mppt: value.mppt || ""
        }));
  
        output.push({ timestamp, values: formattedValues });
      }
    } else {
      output.push({
        timestamp: startDateStr,
        values: [{ sn: "Unknown", value1: 0.0, Strings: "", Plant: "", mppt: "" }]
      });
    }
  
    return output;
  }
  
}
