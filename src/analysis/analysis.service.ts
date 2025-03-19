import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FinalFormatRecord } from "./schemas/final_format.schema";
import { AggregateDataDto, AttributeType } from "./dto/aggregate-data.dto";

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(FinalFormatRecord.name)
    private readonly finalFormatModel: Model<FinalFormatRecord>
  ) {}

  async aggregateData(payload: AggregateDataDto): Promise<any> {
    const { start_date, end_date, plant, inverter, mppt, attribute } = payload;

    if (!start_date || !end_date) {
      throw new BadRequestException("start_date and end_date are required.");
    }

    const startDateObj = `${start_date} 00:00:00`;
const endDateObj = `${end_date} 23:59:59`;
  
    // Base query filter
    const query: any = {
      timestamp: {
        $gte: startDateObj,
        $lte: endDateObj
      }
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

    // ✅ **Dynamically Select Attribute Calculation**
    let selectedAttribute: any = "$u"; // Default: Voltage
    if (attribute === AttributeType.Current) selectedAttribute = "$i";
    if (attribute === AttributeType.Power) selectedAttribute = { $multiply: ["$u", "$i"] };

    let pipeline: any[] = [];

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
            value1: { $avg: selectedAttribute } // **Dynamic Attribute**
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
              timestamp: "$timestamp",
              mppt: "$MPPT",
              plant: plant,
              sn: inverter
            },
            value1: { $avg: selectedAttribute } // **Dynamic Attribute**
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
                plant: "$_id.plant"
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
            value1: { $avg: selectedAttribute } // **Dynamic Attribute**
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

    // ✅ Run the aggregation query
    const results = await this.finalFormatModel.aggregate(pipeline);
    const output: { timestamp: string; values: { sn: string; value1: number; Strings: string; Plant: string; mppt: string }[] }[] = [];

    // ✅ Format the output response
    if (results.length) {
      for (const result of results) {
        const timestamp = result._id;
        const values = result.values || [];

        const formattedValues = values.map((value: any) => ({
          sn: plant && inverter && payload.mppt ? value.Strings : plant && inverter ? value.mppt : value.sn,
          value1: value.value1,
          Strings: value.Strings || "",
          Plant: value.Plant || "",
          mppt: value.mppt || ""
        }));

        output.push({ timestamp, values: formattedValues });
      }
    } else {
      output.push({
        timestamp: startDateObj,
        values: [{ sn: "Unknown", value1: 0.0, Strings: "", Plant: "", mppt: "" }]
      });
    }

    return output;
  }
}