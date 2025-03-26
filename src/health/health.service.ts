import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { StringHour } from "./schemas/string-hour.schema";
import { GetHourlyValuesDto } from "./dto/get-hourly-values.dto";
import { RadiationData } from "./schemas/radiation.schema";
import { GetRadiationIntensityDto } from "./dto/get-radiation-intensity.dto";
import { GetHourlyValuesInterDto } from "./dto/get-hourly-inter.dto";
import { RadiationIntensityInterDto } from "./dto/radiation-intensity-inter.dto";
import * as moment from "moment";

@Injectable()
export class HealthService {
  constructor(
    @InjectModel(StringHour.name) private StringHourModel: Model<StringHour>,
    @InjectModel("RadiationData") private readonly radiationModel: Model<any>
  ) {}
  async getHourlyValues(dto: GetHourlyValuesDto) {
    const { start_date, end_date, plant, inverter, mppt, string } = dto;

    const startDate = start_date.substring(0, 10);
    const endDate = end_date.substring(0, 10);

    const query: any = {
      $or: [
        { Day_Hour: { $regex: `^${startDate}` } },
        { Day_Hour: { $regex: `^${endDate}` } },
      ],
    };

    if (plant) query["Plant"] = plant;
    if (inverter) query["sn"] = inverter;
    if (mppt) query["MPPT"] = mppt;
    if (string) query["Strings"] = string;

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            date: { $substr: ["$Day_Hour", 0, 10] },
            hour: { $toInt: { $substr: ["$Day_Hour", 11, 2] } },
            ...(plant && { plant: "$Plant" }),
            ...(inverter && { inverter: "$sn" }),
            ...(mppt && { mppt: "$MPPT" }),
            ...(string && { string: "$Strings" }),
          },
          avg_u: { $sum: "$P_abd" },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          hourly_values: {
            $push: {
              hour: "$_id.hour",
              value: "$avg_u",
            },
          },
        },
      },
      { $sort: { _id: 1 as 1 | -1 } },
    ];
    const results = await this.StringHourModel.aggregate(pipeline).exec();

    return results.map((result) => ({
      date: result._id,
      hourly_values: result.hourly_values,
    }));
  }

  async getRadiationIntensity(dto: GetRadiationIntensityDto): Promise<any> {
    const { start_date, end_date, stationCode } = dto;

    if (!start_date || !end_date || !stationCode) {
      throw new Error("Missing required parameters.");
    }

    // const startTimestamp = start_date;
    // const endTimestamp = end_date;
    const startTimestamp = moment(start_date, "YYYY-MM-DD"); // 00:00:00 by default
    const endTimestamp = moment(end_date, "YYYY-MM-DD").endOf("day"); // 23:59:59

    const query = {
      $and: [
        { stationCode },
        {
          $or: [
            {
              timestamp: {
                $gte: startTimestamp.format("YYYY-MM-DD HH:mm:ss"),
                $lt: startTimestamp
                  .clone()
                  .add(1, "day")
                  .format("YYYY-MM-DD HH:mm:ss"),
              },
            },
            {
              timestamp: {
                $gte: endTimestamp
                  .clone()
                  .subtract(1, "day")
                  .format("YYYY-MM-DD HH:mm:ss"),
                $lte: endTimestamp.format("YYYY-MM-DD HH:mm:ss"),
              },
            },
          ],
        },
      ],
    };
    const projection = {
      timestamp: 1,
      "dataItemMap.radiation_intensity": 1,
      _id: 0,
    };

    const results = await this.radiationModel
      .find(query, projection)
      .lean()
      .exec();

    const groupedData: Record<string, number[]> = {};

    for (const result of results) {
      const collectTime = result.timestamp;
      console.log(collectTime);
      const collectTimeDt = moment(collectTime, "YYYY-MM-DD HH:mm:ss");
      const date = collectTimeDt.format("YYYY-MM-DD");
      const hour = collectTimeDt.hour();
      const value = result?.dataItemMap?.radiation_intensity ?? 0;

      if (!groupedData[date]) {
        groupedData[date] = new Array(24).fill(0);
      }

      groupedData[date][hour] = value;
    }

    const output = Object.entries(groupedData).map(([date, hourlyValues]) => ({
      date,
      hourly_values: hourlyValues.map((value, hour) => ({ hour, value })),
    }));

    return output;
  }

  async getHourlyValuesInter(dto: GetHourlyValuesInterDto): Promise<any> {
    const {
      date, plant, inverter, mppt, string,
      plant1, inverter1, mppt1, string1,
    } = dto;
  
    const date_filter = date.slice(0, 10);
  
    const buildQuery = (p?: string, i?: string, m?: string, s?: string) => {
      const query: any = { Day_Hour: { $regex: `^${date_filter}` } };
      if (p) query["Plant"] = p;
      if (i) query["sn"] = i;
      if (m) query["MPPT"] = m;
      if (s) query["Strings"] = s;
      return query;
    };
  
    const buildPipeline = (query: any) => {
      const grouping: any = {
        date: { $substr: ["$Day_Hour", 0, 10] },
        hour: { $toInt: { $substr: ["$Day_Hour", 11, 2] } },
      };
      if (query["Plant"]) grouping.plant = "$Plant";
      if (query["sn"]) grouping.inverter = "$sn";
      if (query["MPPT"]) grouping.mppt = "$MPPT";
      if (query["Strings"]) grouping.string = "$Strings";
  
      return [
        { $match: query },
        {
          $group: {
            _id: grouping,
            avg_u: { $sum: "$P_abd" }
          }
        },
        {
          $group: {
            _id: "$_id.date",
            hourly_values: {
              $push: {
                hour: "$_id.hour",
                value: "$avg_u"
              }
            }
          }
        },
        { $sort: { _id: 1 as 1 | -1 } },
       
      ];
    };
  
    const query1 = buildQuery(plant, inverter, mppt, string);
    const query2 = buildQuery(plant1, inverter1, mppt1, string1);
    const pipeline1 = buildPipeline(query1);
    const pipeline2 = buildPipeline(query2);
  
    const results_set1 = await this.StringHourModel.aggregate(pipeline1).exec();
    const results_set2 = await this.StringHourModel.aggregate(pipeline2).exec();
  
    let key1 = "Set 1", key2 = "Set 2";
    if (plant && !inverter && !mppt && !string) {
      key1 = `Plant 1 - ${plant}`;
      key2 = `Plant 2 - ${plant1}`;
    } else if (plant && inverter && !mppt && !string) {
      key1 = `Inverter 1 - ${inverter}`;
      key2 = `Inverter 2 - ${inverter1}`;
    } else if (plant && inverter && mppt && !string) {
      key1 = `MPPT 1 - ${mppt}`;
      key2 = `MPPT 2 - ${mppt1}`;
    } else if (plant && inverter && mppt && string) {
      key1 = `String 1 - ${string}`;
      key2 = `String 2 - ${string1}`;
    }
  
    const response = {
      [key1]: results_set1.map(result => ({
        date: result._id,
        hourly_values: result.hourly_values,
      })),
      [key2]: results_set2.map(result => ({
        date: result._id,
        hourly_values: result.hourly_values,
      })),
    };
  
    return response;
  }

  async getRadiationIntensityInter(dto: RadiationIntensityInterDto): Promise<any> {
    const { date, stationCode1, stationCode2, option } = dto;
  
    // Station label mapping
    const stationLabelMap = {
      [stationCode1]: 'Plant 1 - Coca Cola Faisalabad',
      [stationCode2]: 'Plant 2 - Coca Cola Faisalabad',
    };
  
    // Default 24-hour structure
    const defaultHourlyValues = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: 0,
    }));
  
    // Build MongoDB query
    const query = {
      stationCode: { $in: [stationCode1, stationCode2] },
      timestamp: { $regex: `^${date}` },
    };
  
    // Projection
    const projection: any = {
      timestamp: 1,
      stationCode: 1,
      _id: 0,
    };
  
    if (option === 1) {
      projection['dataItemMap.radiation_intensity'] = 1;
    } else if (option === 2) {
      projection['dataItemMap.inverter_power'] = 1;
    }
  
    // Fetch from MongoDB
    const results = await this.radiationModel.find(query, projection).lean();
  
    // Prepare grouped data
    const groupedData: Record<string, { hour: number; value: number }[]> = {
      [stationCode1]: [...defaultHourlyValues],
      [stationCode2]: [...defaultHourlyValues],
    };
  
    for (const result of results) {
      const stationCode = result.stationCode;
      const timestamp = moment(result.timestamp, 'YYYY-MM-DD HH:mm:ss');
      const hour = timestamp.hour();
  
      let value = 0;
      if (option === 1) {
        value = result.dataItemMap?.radiation_intensity ?? 0;
      } else if (option === 2) {
        value = result.dataItemMap?.inverter_power ?? 0;
      }
  
      if (stationCode in groupedData) {
        groupedData[stationCode][hour].value = value;
      }
    }
  
    // Final output
    return [
      {
        stationCode: stationLabelMap[stationCode1] || stationCode1,
        date,
        hourly_values: groupedData[stationCode1],
      },
      {
        stationCode: stationLabelMap[stationCode2] || stationCode2,
        date,
        hourly_values: groupedData[stationCode2],
      },
    ];
  }
  
}
