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

    // ✅ Define Attribute Mapping
    let selectedAttribute: any = "$u"; // Default: Voltage
    if (attribute === AttributeType.Current) selectedAttribute = "$i";
    if (attribute === AttributeType.Power) selectedAttribute = { $multiply: ["$u", "$i"] }; // Only for 5min resolution

    let pipeline: any[] = [];

    // ✅ **Logic for Resolution Selection**

    // ✅ Case 1: `5min` Resolution (Keep existing logic, Fetch from `final_format`)
    if (resolution === ResolutionType.FiveMin) {
      pipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              timestamp: "$timestamp",
              Strings: "$Strings",
              Plant: plant,
              sn: inverter,
              mppt: mppt
            },
            value1: { $avg: selectedAttribute } // **Use existing calculation**
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

      // ✅ Run Query on `final_format`
      const results = await this.finalFormatModel.aggregate(pipeline);
      return this.formatOutput(results, startDateObj);
    }

   // ✅ Case 2: `hourly` Resolution (Fetch from `String_hourly`)
if (resolution === ResolutionType.Hourly) {
  let selectedHourlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedHourlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedHourlyAttribute = "$P_abd"; 

  pipeline = [
    {
      $match: {
        Day_Hour: { // ✅ Match full range instead of regex
          $gte: `${start_date} 00`, // ✅ Include all hours within the date range
          $lte: `${end_date} 23`
        },
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
    {
      $group: {
        _id: {
          timestamp: "$Day_Hour", // ✅ Group by hourly timestamp
          Strings: "$Strings",
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: { $avg: selectedHourlyAttribute } // **Dynamic Attribute (Power, Voltage, or Current)**
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

  // ✅ Run Query on `String_hourly`
  const results = await this.stringHourlyModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}

    // ✅ Case 3: `daily` Resolution (Fetch from `String_Day`)
if (resolution === ResolutionType.Daily) {
  let selectedDailyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedDailyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedDailyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: { 
          $gte: start_date, // ✅ Match full date range
          $lte: end_date
        },
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
    {
      $group: {
        _id: {
          timestamp: "$Day", // ✅ Group by Day
          Strings: "$Strings",
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: { $avg: selectedDailyAttribute } // **Dynamic Attribute Selection**
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

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}


// ✅ Case 4: Weekly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Weekly) {
  let selectedWeeklyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedWeeklyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedWeeklyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: { $gte: start_date, $lte: end_date }, // ✅ Fetch all days in the range
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
    {
      $addFields: {
        fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } } // ✅ Convert Day to Date
      }
    },
    {
      $addFields: {
        week: { $week: "$fullDate" }, // ✅ Extract week number
        year: { $year: "$fullDate" }  // ✅ Extract year to differentiate weeks of different years
      }
    },
    {
      $group: {
        _id: {
          year: "$year",
          week: "$week",
          Strings: "$Strings",
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: attribute === AttributeType.Current
          ? { $sum: selectedWeeklyAttribute } // ✅ SUM for Current
          : { $avg: selectedWeeklyAttribute } // ✅ AVG for Voltage & Power
      }
    },
    {
      $group: {
        _id: { 
          year: "$_id.year", 
          week: "$_id.week" 
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
    { $sort: { "_id.year": 1, "_id.week": 1 } } // ✅ Sort by Year & Week
  ];

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}

// ✅ Case 5: Monthly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Monthly) {
  let selectedMonthlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedMonthlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedMonthlyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: { $gte: start_date, $lte: end_date }, // ✅ Fetch all days in the range
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
    {
      $addFields: {
        fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } } // ✅ Convert Day to Date
      }
    },
    {
      $addFields: {
        month: { $month: "$fullDate" }, // ✅ Extract month number (1-12)
        year: { $year: "$fullDate" }  // ✅ Extract year to differentiate months of different years
      }
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          Strings: "$Strings",
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: attribute === AttributeType.Current
          ? { $sum: selectedMonthlyAttribute } // ✅ SUM for Current
          : { $avg: selectedMonthlyAttribute } // ✅ AVG for Voltage & Power
      }
    },
    {
      $group: {
        _id: { 
          year: "$_id.year", 
          month: "$_id.month" 
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
    { $sort: { "_id.year": 1, "_id.month": 1 } } // ✅ Sort by Year & Month
  ];

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}


// ✅ Case 6: Quarterly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Quarter) {
  let selectedQuarterlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedQuarterlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedQuarterlyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: { $gte: start_date, $lte: end_date }, // ✅ Fetch all days in the range
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
    {
      $addFields: {
        fullDate: { $dateFromString: { dateString: "$Day", format: "%Y-%m-%d" } } // ✅ Convert Day to Date
      }
    },
    {
      $addFields: {
        quarter: { 
          $switch: { // ✅ Extract quarter based on month
            branches: [
              { case: { $lte: [{ $month: "$fullDate" }, 3] }, then: 1 }, // Jan - Mar
              { case: { $lte: [{ $month: "$fullDate" }, 6] }, then: 2 }, // Apr - Jun
              { case: { $lte: [{ $month: "$fullDate" }, 9] }, then: 3 }, // Jul - Sep
              { case: { $lte: [{ $month: "$fullDate" }, 12] }, then: 4 }  // Oct - Dec
            ],
            default: null
          }
        },
        year: { $year: "$fullDate" }  // ✅ Extract year to differentiate quarters of different years
      }
    },
    {
      $group: {
        _id: {
          year: "$year",
          quarter: "$quarter",
          Strings: "$Strings",
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: attribute === AttributeType.Current
          ? { $sum: selectedQuarterlyAttribute } // ✅ SUM for Current
          : { $avg: selectedQuarterlyAttribute } // ✅ AVG for Voltage & Power
      }
    },
    {
      $group: {
        _id: { 
          year: "$_id.year", 
          quarter: "$_id.quarter" 
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
    { $sort: { "_id.year": 1, "_id.quarter": 1 } } // ✅ Sort by Year & Quarter
  ];

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}

// ✅ Case 7: Half-Yearly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.HalfYearly) {
  let selectedHalfYearlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedHalfYearlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedHalfYearlyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: {
          $gte: start_date,
          $lte: end_date
        },
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
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
            1, // Jan to Jun
            2  // Jul to Dec
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
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: attribute === AttributeType.Current
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

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}

// ✅ Case 8:Yearly Resolution (Derived from `String_Day`)
if (resolution === ResolutionType.Yearly) {
  let selectedYearlyAttribute: any = "$u"; // Default: Voltage
  if (attribute === AttributeType.Current) selectedYearlyAttribute = "$i";
  if (attribute === AttributeType.Power) selectedYearlyAttribute = "$P_abd";

  pipeline = [
    {
      $match: {
        Day: {
          $gte: start_date,
          $lte: end_date
        },
        Plant: plant,
        sn: inverter,
        MPPT: mppt
      }
    },
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
          Plant: "$Plant",
          sn: "$sn",
          mppt: "$MPPT"
        },
        value1: attribute === AttributeType.Current
          ? { $sum: selectedYearlyAttribute }     // Sum for Current
          : { $avg: selectedYearlyAttribute }     // Avg for Voltage or Power
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

  const results = await this.stringDayModel.aggregate(pipeline);
  return this.formatOutput(results, startDateObj);
}

   
    throw new BadRequestException("Invalid resolution. Allowed values: 5min, hourly.");
  }

  // ✅ **Format Output Function (Reused for Both Resolutions)**
  private formatOutput(results: any[], startDateStr: string) {
    const output: { timestamp: string; values: { sn: string; value1: number; Strings: string; Plant: string; mppt: string }[] }[] = [];

    if (results.length) {
      for (const result of results) {
        const timestamp = result._id;
        const values = result.values || [];

        const formattedValues = values.map((value: any) => ({
          sn: value.sn,
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
