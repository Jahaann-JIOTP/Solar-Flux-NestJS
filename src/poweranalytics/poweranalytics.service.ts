// power.service.ts
import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GmHourly, GmHourlyDocument } from "./schemas/gm-hourly.schema";
import { CalculatePowerDto } from "./dto/calculate-power.dto";
import { CalculatePowerDayDto } from "./dto/active_power_day.dto";
import { CalculatePowerWeekDto } from "./dto/active_power_weekday.dto";
import { CalculateActivePowerWeek1Dto } from "./dto/calculate_active_power_week1.dto";
import { CalculateActivePowerHourWeek1Dto } from "./dto/active_power_hour_week1.dto";
import { PipelineStage } from "mongoose";

@Injectable()
export class PowerService {
  constructor(
    @InjectModel(GmHourly.name)
    private readonly gmHourlyModel: Model<GmHourlyDocument>
  ) {}
  // Tab 1  HOUR WISE CONSUMPTION
  async calculateActivePower(payload: CalculatePowerDto) {
    try {
      const { start_date, end_date, peakhour, nonpeakhour, plant } = payload;

      if (!start_date || !end_date) {
        throw new HttpException(
          "start_date and end_date are required",
          HttpStatus.BAD_REQUEST
        );
      }

      const pipeline = [
        { $match: { Day: { $gte: start_date, $lte: end_date }, Plant: plant } },
        {
          $project: {
            hour: { $arrayElemAt: [{ $split: ["$Day_Hour", " "] }, 1] },
            active_power: 1,
          },
        },
        {
          $group: {
            _id: "$hour",
            average_active_power: { $sum: "$active_power" },
          },
        },
        { $sort: { _id: 1 as 1 } },
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      return {
        data: results.map((result) => {
          const hour = result._id.padStart(2, "0");
          const averagePower = result.average_active_power;
          const hourInt = parseInt(hour, 10);
          const costMultiplier =
            (hourInt >= 0 && hourInt <= 18) || hourInt === 23
              ? nonpeakhour
              : hourInt >= 19 && hourInt <= 22
              ? peakhour
              : 0;
          const cost = averagePower * costMultiplier;

          return {
            hour,
            value: parseFloat(averagePower.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
          };
        }),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Tab 1  SHIFT WISE CONSUMPTION
  async calculateActivePowerGroup(payload: CalculatePowerDto) {
    try {
      const { start_date, end_date, plant, peakhour, nonpeakhour } = payload;
      if (!start_date || !end_date) {
        throw new HttpException(
          "start_date and end_date are required",
          HttpStatus.BAD_REQUEST
        );
      }

      const pipeline = [
        { $match: { Day: { $gte: start_date, $lte: end_date }, Plant: plant } },
        {
          $project: {
            hour: {
              $toInt: { $arrayElemAt: [{ $split: ["$Day_Hour", " "] }, 1] },
            },
            active_power: 1,
          },
        },
        {
          $project: {
            hour_range: {
              $switch: {
                branches: [
                  { case: { $lt: ["$hour", 6] }, then: "0-6" },
                  { case: { $lt: ["$hour", 12] }, then: "6-12" },
                  { case: { $lt: ["$hour", 18] }, then: "12-18" },
                  { case: { $lt: ["$hour", 24] }, then: "18-24" },
                ],
                default: "Unknown",
              },
            },
            active_power: 1,
          },
        },
        {
          $group: {
            _id: "$hour_range",
            total_active_power: { $sum: "$active_power" },
          },
        },
        { $sort: { _id: 1 as 1 } },
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      const response_data = results.map((result) => {
        const hour_range = result._id;
        const total_power = result.total_active_power;
        const cost_multiplier = hour_range === "18-24" ? peakhour : nonpeakhour;
        const cost = total_power * cost_multiplier;

        return {
          hour_range,
          value: parseFloat(total_power.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
        };
      });

      return { data: response_data };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Tab 1  POWER CONSUMPTION
  async calculateActivePowerDay(payload: CalculatePowerDayDto) {
    try {
      const { start_date, end_date, tarrif, option = 1, plant } = payload;

      if (!start_date || !end_date) {
        throw new HttpException(
          "start_date and end_date are required",
          HttpStatus.BAD_REQUEST
        );
      }
      if (![1, 2, 3].includes(option)) {
        throw new HttpException(
          "Invalid option. Must be 1, 2, or 3",
          HttpStatus.BAD_REQUEST
        );
      }

      const matchStage: any = {
        $match: { Day: { $gte: start_date, $lte: end_date } },
      };
      if (plant) {
        matchStage.$match.Plant = plant;
      }
      let groupStage;
      let sortStage = { $sort: { _id: 1 } };

      if (option === 1) {
        groupStage = {
          $group: {
            _id: "$Day",
            total_active_power: { $sum: "$active_power" },
          },
        };
      } else if (option === 2) {
        groupStage = {
          $group: {
            _id: { $week: { $dateFromString: { dateString: "$Day" } } },
            total_active_power: { $sum: "$active_power" },
          },
        };
      } else {
        groupStage = {
          $group: {
            _id: { $month: { $dateFromString: { dateString: "$Day" } } },
            total_active_power: { $sum: "$active_power" },
          },
        };
      }

      const pipeline = [matchStage, groupStage, sortStage];
      const results = await this.gmHourlyModel.aggregate(pipeline);

      return {
        data: results.map((result) => {
          const groupKey = result._id;
          const totalPower = result.total_active_power;
          // const cost = totalPower * tarrif;
          const cost = totalPower * (tarrif ?? 0);

          let groupLabel;
          if (option === 1) {
            groupLabel = groupKey;
          } else if (option === 2) {
            groupLabel = `Week ${groupKey}`;
          } else {
            groupLabel = `Month ${groupKey}`;
          }

          return {
            group: groupLabel,
            value: parseFloat(totalPower.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
          };
        }),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Tab 1  DAY WISE CONSUMPTION
  async activePowerWeekday(payload: CalculatePowerWeekDto) {
    try {
      const { start_date, end_date, aggregation, plant } = payload;

      if (!start_date || !end_date) {
        throw new HttpException(
          "start_date and end_date are required",
          HttpStatus.BAD_REQUEST
        );
      }

      const pipeline = [
        {
          $match: {
            Day: { $gte: start_date, $lte: end_date },
            Plant: plant,
          },
        },
        {
          $project: {
            weekday: {
              $isoDayOfWeek: { $dateFromString: { dateString: "$Day" } },
            },
            active_power: 1,
            aggregation_type: {
              $cond: {
                if: { $eq: [aggregation, 1] },
                then: "sum",
                else: "avg",
              },
            },
          },
        },
        {
          $group: {
            _id: "$weekday",
            total_active_power: {
              $sum: {
                $cond: {
                  if: { $eq: ["$aggregation_type", "sum"] },
                  then: "$active_power",
                  else: 0,
                },
              },
            },
            average_active_power: {
              $avg: {
                $cond: {
                  if: { $eq: ["$aggregation_type", "avg"] },
                  then: "$active_power",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            total_active_power: {
              $cond: {
                if: { $eq: [aggregation, 1] },
                then: "$total_active_power",
                else: "$average_active_power",
              },
            },
            _id: 0,
            weekday: "$_id",
          },
        },
        { $sort: { weekday: 1 as 1 | -1 } },
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      const weekdayMap = {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
        7: "Sunday",
      };

      const responseData = results.map((result) => ({
        weekday: weekdayMap[result.weekday],
        value: parseFloat(result.total_active_power.toFixed(2)),
      }));

      return { data: responseData };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Tab 2  WEEKLY POWER CONSUMPTION
  async calculateActivePowerWeek1(payload: CalculateActivePowerWeek1Dto) {
    try {
      const { week_numbers, year, plant } = payload;

      // Aggregation Pipeline
      const pipeline: any[] = [
        {
          $match: { Plant: plant },
        },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $dateFromString: { dateString: "$Day" } },
              },
            },
            weekday: {
              $dayOfWeek: { $dateFromString: { dateString: "$Day" } },
            },
            week_number: {
              $isoWeek: { $dateFromString: { dateString: "$Day" } },
            },
            year: { $year: { $dateFromString: { dateString: "$Day" } } },
            active_power: 1,
          },
        },
        {
          $match: {
            week_number: { $in: week_numbers },
            year: year,
          },
        },
        {
          $group: {
            _id: {
              day: "$day",
              weekday: "$weekday",
              week_number: "$week_number",
            },
            total_P_abd: { $sum: "$active_power" },
          },
        },
        {
          $sort: { "_id.week_number": 1, "_id.weekday": 1 },
        },
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      // Prepare the response data
      const week_data: Record<number, any> = {
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
        6: {},
        7: {},
      };

      for (const result of results) {
        const week_number = result._id.week_number;
        const weekday = result._id.weekday;
        const total_P_abd = result.total_P_abd;

        const weekday_name = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][weekday - 1];

        if (!week_data[weekday][`week${week_number}`]) {
          week_data[weekday][`week${week_number}`] =
            Math.round(total_P_abd * 100) / 100;
        }
      }

      const response_data = [
        { weekday: "Monday", week_data: [week_data[2]] },
        { weekday: "Tuesday", week_data: [week_data[3]] },
        { weekday: "Wednesday", week_data: [week_data[4]] },
        { weekday: "Thursday", week_data: [week_data[5]] },
        { weekday: "Friday", week_data: [week_data[6]] },
        { weekday: "Saturday", week_data: [week_data[7]] },
        { weekday: "Sunday", week_data: [week_data[1]] },
      ];

      return { data: response_data };
    } catch (error) {
      return { error: error.message };
    }
  }
  // Tab 2  HOURLY POWER CONSUMPTION
  async calculateActivePowerHourWeek1(
    dto: CalculateActivePowerHourWeek1Dto
  ): Promise<any> {
    try {
      const { week_number, year, plant, option } = dto;

      // ✅ Use your original logic to calculate weekly date ranges
      const dateRanges = week_number.map((week) => {
        const janFirst = new Date(`${year}-01-01`);
        const janFirstDay = janFirst.getDay(); // 0 = Sunday

        // 👇 Find first Sunday of the year
        const daysUntilFirstSunday = janFirstDay === 0 ? 0 : 7 - janFirstDay;
        const firstSunday = new Date(janFirst);
        firstSunday.setDate(janFirst.getDate() + daysUntilFirstSunday);

        // 👇 Calculate start date for the given week (starting Sunday)
        const startOfWeek = new Date(firstSunday);
        startOfWeek.setDate(firstSunday.getDate() + (week - 1) * 7);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return {
          start: startOfWeek.toISOString().split("T")[0],
          end: endOfWeek.toISOString().split("T")[0],
        };
      });

      console.log("📅 Week Date Ranges (Sunday Start):", dateRanges);

      // Create aggregation pipeline
      const pipeline: PipelineStage[] = [
        {
          $match: {
            $or: dateRanges.map((range) => ({
              Day: { $gte: range.start, $lte: range.end },
            })),
            Day_Hour: { $regex: /^\d{4}-\d{2}-\d{2} \d{1,2}$/ },
            Plant: plant,
          },
        },
        {
          $project: {
            hour: {
              $let: {
                vars: {
                  hour_raw: {
                    $arrayElemAt: [{ $split: ["$Day_Hour", " "] }, 1],
                  },
                },
                in: {
                  $cond: {
                    if: { $lt: [{ $toInt: "$$hour_raw" }, 10] },
                    then: { $concat: ["0", "$$hour_raw"] },
                    else: "$$hour_raw",
                  },
                },
              },
            },
            weekday: {
              $dayOfWeek: {
                $dateFromString: {
                  dateString: {
                    $arrayElemAt: [{ $split: ["$Day_Hour", " "] }, 0],
                  },
                },
              },
            },
            active_power: 1,
          },
        },
        {
          $group: {
            _id: { hour: "$hour", weekday: "$weekday" },
            total_active_power:
              option === 1
                ? { $sum: "$active_power" }
                : { $avg: "$active_power" },
          },
        },
        {
          $sort: {
            "_id.hour": 1 as 1,
            "_id.weekday": 1 as 1,
          },
        },
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      const hourData: Record<string, Record<number, number>> = {};
      for (let i = 0; i < 24; i++) {
        hourData[i.toString().padStart(2, "0")] = {
          1: 0, // Sunday
          2: 0, // Monday
          3: 0, // Tuesday
          4: 0, // Wednesday
          5: 0, // Thursday
          6: 0, // Friday
          7: 0, // Saturday
        };
      }

      for (const result of results) {
        const hour = result._id.hour;
        const weekday = result._id.weekday;
        const totalActivePower = result.total_active_power;
        hourData[hour][weekday] = Math.round(totalActivePower * 100) / 100;
      }

      const weekdayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const responseData = Object.entries(hourData).map(([hour, weekdays]) => ({
        hour,
        weekdays: Object.entries(weekdays).reduce((acc, [weekday, value]) => {
          acc[weekdayNames[parseInt(weekday) - 1]] = value;
          return acc;
        }, {}),
      }));

      return { data: responseData };
    } catch (error) {
      throw new Error(`Aggregation Error: ${error.message}`);
    }
  }
}
