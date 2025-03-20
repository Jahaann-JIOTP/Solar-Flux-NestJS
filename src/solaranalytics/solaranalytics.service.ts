import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OverallData } from "./schemas/overall-data.schema";
import { StringHour } from "./schemas/string-hour.schema";
import { GroupedEfficiencyDto } from "./dto/grouped-efficiency.dto";
import * as moment from "moment";
@Injectable()
export class SolarAnalyticsService {
  constructor(
    @InjectModel(OverallData.name)
    private readonly overallDataModel: Model<OverallData>,
    @InjectModel(StringHour.name) private StringHourModel: Model<StringHour>
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
          P_abd_sum: result.P_abd_sum, // Adjusted per requirement
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
}
