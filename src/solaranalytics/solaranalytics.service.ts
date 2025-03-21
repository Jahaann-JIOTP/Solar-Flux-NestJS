import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OverallData } from "./schemas/overall-data.schema";
import { StringHour } from "./schemas/string-hour.schema";
import { GroupedEfficiencyDto } from "./dto/grouped-efficiency.dto";
import * as moment from "moment";
import { StringDay } from "./schemas/string-day.schema";
import { GetDataDto } from "./dto/get-data.dto";
@Injectable()
export class SolarAnalyticsService {
  constructor(
    @InjectModel(OverallData.name)
    private readonly overallDataModel: Model<OverallData>,
    @InjectModel(StringHour.name) private StringHourModel: Model<StringHour>,
    @InjectModel(StringDay.name) private StringDayModel: Model<StringDay>
  ) {}

  async getStrings(Plant: string, devId: string, mppt: string) {
    try {
      const pipeline = [
        {
          $match: {
            "dataItemMap.Plant": Plant, // Plant ke basis par filter
            "dataItemMap.sn": devId,
            "dataItemMap.MPPT": mppt,
          },
        },
        { $group: { _id: "$dataItemMap.Strings" } },
        {
          $project: {
            _id: 0,
            value: "$_id",
            label: "$_id",
          },
        },
      ];

      const results = await this.overallDataModel.aggregate(pipeline).exec();
      return results;
    } catch (error) {
      throw new HttpException(
        { error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getGroupedEfficiency(dto: GroupedEfficiencyDto) {
    try {
      const { start_date, end_date, plant, inverter, mppt, string } = dto;

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      endDate.setDate(endDate.getDate() + 1);

      const query: any = {
        Plant: plant,
        Day_Hour: {
          $gte: startDate.toISOString().split("T")[0],
          $lt: endDate.toISOString().split("T")[0],
        },
      };
      if (inverter) query["sn"] = inverter;
      if (mppt) query["MPPT"] = mppt;
      if (string) query["Strings"] = string;

      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              Day_Hour: "$Day_Hour",
              Plant: "$Plant",
              ...(inverter ? { sn: "$sn" } : {}),
              ...(mppt ? { MPPT: "$MPPT" } : {}),
              ...(string ? { Strings: "$Strings" } : {}),
            },
            P_abd_sum: { $sum: "$P_abd" },
          },
        },
        { $sort: { "_id.Day_Hour": 1 as 1 | -1 } },
      ];

      const results = await this.StringHourModel.aggregate(pipeline).exec();

      return results.map((result) => {
        if (!result._id.Day_Hour) {
          console.error("Error: Day_Hour is null or undefined!", result);
          return { ...result, Hour: null };
        }
        // Split Day_Hour to get hour (format: "YYYY-MM-DD H")
        const parts = result._id.Day_Hour.split(" "); // ["2024-09-21", "0"]
        const dateOnly = parts[0];
        const hour = parseInt(parts[1], 10); // Convert "0" to 0 (integer)
        if (isNaN(hour)) {
          console.error("Error: Invalid Hour!", result._id.Day_Hour);
          return { ...result, Hour: null };
        }
        const output: any = {
          Day_Hour: dateOnly,
          Hour: isNaN(hour) ? null : hour,
          Plant: result._id.Plant,
          P_abd_sum: (result.P_abd_sum / 2400) * 100,
          ...(inverter && { sn: result._id.sn }),
          ...(mppt && { MPPT: result._id.MPPT }),
          ...(string && { Strings: result._id.Strings })
        };

        if (inverter) output.sn = result._id.sn;
        if (mppt) output.MPPT = result._id.MPPT;
        if (string) output.Strings = result._id.Strings;

        return output;
      });
    } catch (error) {
      throw new Error(`Error fetching efficiency data: ${error.message}`);
    }
  }

  async getData(dto: GetDataDto) {
    const { start_date, end_date, plant, inverter, mppt, string, option, ph } =
      dto;

    const matchStage = {
      $match: {
        Day: { $gte: start_date, $lte: end_date },
        Plant: plant,
      },
    };

    if (inverter) matchStage.$match["sn"] = inverter;
    if (mppt) matchStage.$match["MPPT"] = mppt;
    if (string) matchStage.$match["Strings"] = string;

    let groupStage;
    if (option === 1) {
      groupStage = {
        $group: {
          _id: {
            date: "$Day",
            plant: "$Plant",
            inverter: inverter ? "$sn" : null,
            mppt: mppt ? "$MPPT" : null,
            string: string ? "$Strings" : null,
          },
          total_P_abd: { $sum: "$P_abd" },
          P_abd: { $first: "$P_abd" }, // Include first P_abd value
        },
      };
    } else if (option === 2) {
      groupStage = {
        $group: {
          _id: {
            date: {
              $toString: {
                $isoWeek: {
                  $dateFromString: {
                    dateString: "$Day",
                    format: "%Y-%m-%d",
                  },
                },
              },
            },
            plant: "$Plant",
            inverter: inverter ? "$sn" : null,
            mppt: mppt ? "$MPPT" : null,
            string: string ? "$Strings" : null,
          },
          total_P_abd: { $sum: "$P_abd" },
          P_abd: { $first: "$P_abd" }, // Include first P_abd value
        },
      };
    } else if (option === 3) {
      // Group by Month
      groupStage = {
        $group: {
          _id: {
            date: {
              $toString: {
                $month: {
                  $dateFromString: {
                    dateString: "$Day",
                    format: "%Y-%m-%d",
                  },
                },
              },
            },
            year: { $year: { $dateFromString: { dateString: "$Day" } } },
            plant: "$Plant",
            inverter: inverter ? "$sn" : null,
            mppt: mppt ? "$MPPT" : null,
            string: string ? "$Strings" : null,
          },
          total_P_abd: { $sum: "$P_abd" },
          P_abd: { $first: "$P_abd" }, // Include first P_abd value
        },
      };
    } else {
      groupStage = {
        $group: {
          _id: {
            month: { $month: "$Day" },
            year: { $year: "$Day" },
            plant: "$Plant",
          },
          total_P_abd: { $sum: "$P_abd" },
        },
      };
    }

    const projectStage = {
      $project: {
        _id: 0,
        date:
          option === 2
            ? { $concat: ["Week ", "$_id.date"] }
            : option === 3
            ? { $concat: ["Month ", "$_id.date"] }
            : "$_id.date",
        year: option === 3 ? "$_id.year" : null,
        plant: "$_id.plant",
        inverter: "$_id.inverter",
        mppt: "$_id.mppt",
        string: "$_id.string",
        sum_abd: { $multiply: ["$total_P_abd", ph] },
        P_abd: "$total_P_abd",
      },
    };

    const pipeline = [matchStage, groupStage, projectStage];
    return this.StringDayModel.aggregate(pipeline);
  }

  async getGrouped(dto: GroupedEfficiencyDto) {
    try {
      const { start_date, end_date, plant, inverter, mppt, string } = dto;

      const startDate = moment(start_date, "YYYY-MM-DD").toDate();
      const endDate = moment(end_date, "YYYY-MM-DD").add(1, "days").toDate();

      const query: any = {
        Plant: plant,
        Day_Hour: { $gte: moment(startDate).format('YYYY-MM-DD'), $lte: moment(endDate).format('YYYY-MM-DD') },
      };
      if (inverter) query.sn = inverter;
      if (mppt) query.MPPT = mppt;
      if (string) query.Strings = string;

      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              Day_Hour: '$Day_Hour',
              Plant: '$Plant',
              sn: inverter ? '$sn' : null,
              MPPT: mppt ? '$MPPT' : null,
              Strings: string ? '$Strings' : null,
            },
            P_abd_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { "_id.Day_Hour": 1 as 1 | -1 } },
      ];

      const results = await this.StringHourModel.aggregate(pipeline).exec();

      return results.map((result) => {
        if (!result._id.Day_Hour) {
          console.error("Error: Day_Hour is null or undefined!", result);
          return { ...result, Hour: null };
        }
        // Split Day_Hour to get hour (format: "YYYY-MM-DD H")
        const parts = result._id.Day_Hour.split(" "); // ["2024-09-21", "0"]
        const dateOnly = parts[0];
        const hour = parseInt(parts[1], 10); // Convert "0" to 0 (integer)
        if (isNaN(hour)) {
          console.error("Error: Invalid Hour!", result._id.Day_Hour);
          return { ...result, Hour: null };
        }
        const output: any = {
          Day_Hour: dateOnly,
          Hour: isNaN(hour) ? null : hour,
          Plant: result._id.Plant,
          P_abd_sum: result.P_abd_sum,
          ...(inverter && { sn: result._id.sn }),
          ...(mppt && { MPPT: result._id.MPPT }),
          ...(string && { Strings: result._id.Strings }),
        };
        return output;
      });
    } catch (error) {
      throw new Error(`Error fetching efficiency data: ${error.message}`);
    }
  }
}
