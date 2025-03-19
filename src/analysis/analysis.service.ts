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

    // ✅ Convert date formats
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);

    // ✅ Convert Dates to String Format to Match Database Timestamp Field
    const startDateStr = startDateObj.toISOString().replace("T", " ").split(".")[0];
    const endDateStr = endDateObj.toISOString().replace("T", " ").split(".")[0];

    // ✅ Base Query Filter
    const query: any = {
      timestamp: {
        $gte: startDateStr,
        $lte: endDateStr
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
        timestamp: startDateStr,
        values: [{ sn: "Unknown", value1: 0.0, Strings: "", Plant: "", mppt: "" }]
      });
    }

    return output;
  }
}



// async aggregateData(payload: AggregateDataDto): Promise<any> {
//     const { start_date, end_date, plant, inverter, mppt, attribute, resolution } = payload;

//     if (!start_date || !end_date) {
//         throw new BadRequestException("start_date and end_date are required.");
//     }

//     const startDateObj = new Date(start_date);
//     const endDateObj = new Date(end_date);

//     // ** Base Query Filter **
//     startDateObj.setHours(0, 0, 0, 0);  // Start of the day (00:00:00)
//     endDateObj.setHours(23, 59, 59, 999); // End of the day (23:59:59)
    
//     let query: any = {
//         timestamp: {
//             $gte: startDateObj.toISOString(),  // Ensure full day is covered
//             $lte: endDateObj.toISOString(),
//         },
//         Plant: plant
//     };
    
//    console.log(query);
//     if (inverter) query["sn"] = inverter;
//     if (mppt) query["MPPT"] = mppt;

//     let pipeline: any[] = [{ $match: query }];

//     // ** Dynamic Attribute Selection **
//     let selectedAttribute: any = "$u"; // Default: Voltage
//     if (attribute === "Current") selectedAttribute = "$i";
//     if (attribute === "Power") selectedAttribute = { $multiply: ["$u", "$i"] };

//     // ** 🔄 Resolution Handling Logic **
//     let groupByField: any = {};
//     let aggregationLogic: any = {};

//     // ✅ If resolution is 5-Minute, return raw data (NO GROUPING)
//     if (resolution === "5 Minute") {
//         pipeline.push({
//             $group: {
//                 _id: {
//                     timestamp: "$timestamp",
//                     Strings: "$Strings",
//                     Plant: "$Plant",
//                     sn: "$sn",
//                     mppt: "$MPPT"
//                 },
//                 value1: { $avg: selectedAttribute }
//             }
//         });

//         pipeline.push({
//             $group: {
//                 _id: "$_id.timestamp",
//                 values: {
//                     $push: {
//                         Strings: "$_id.Strings",
//                         value1: "$value1",
//                         Plant: "$_id.Plant",
//                         sn: "$_id.sn",
//                         mppt: "$_id.mppt"
//                     }
//                 }
//             }
//         });

//         pipeline.push({ $sort: { "_id": 1 } });

//     } else {
//         // ** 📌 Grouping Logic for Other Resolutions **
//         if (resolution === "Hourly") {
//             groupByField = {
//                 timestamp: {
//                     $dateToString: { format: "%Y-%m-%d %H:00:00", date: { $toDate: "$timestamp" } } // ✅ FIXED
//                 },
//                 Strings: "$Strings"
//             };
//         } else if (resolution === "Daily") {
//             groupByField = {
//                 timestamp: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
//                 Strings: "$Strings"
//             };
//         } else if (resolution === "Weekly") {
//             groupByField = {
//                 timestamp: { $toString: { $week: "$timestamp" } },
//                 Strings: "$Strings"
//             };
//         } else if (resolution === "Monthly") {
//             groupByField = {
//                 timestamp: { $dateToString: { format: "%Y-%m", date: "$timestamp" } },
//                 Strings: "$Strings"
//             };
//         } else if (resolution === "Quarter") {
//             groupByField = {
//                 timestamp: {
//                     $concat: [
//                         { $dateToString: { format: "%Y", date: "$timestamp" } },
//                         "-Q",
//                         { $toString: { $ceil: { $divide: [{ $toInt: { $dateToString: { format: "%m", date: "$timestamp" } } }, 3] } } }
//                     ]
//                 },
//                 Strings: "$Strings"
//             };
//         } else if (resolution === "Yearly") {
//             groupByField = {
//                 timestamp: { $dateToString: { format: "%Y", date: "$timestamp" } },
//                 Strings: "$Strings"
//             };
//         }
        

//         // ** 📌 Define Aggregation Logic for Sum/Average Based on Attribute **
//         aggregationLogic = { value1: { $avg: selectedAttribute } };
//         if (attribute === "Current" || attribute === "Power") {
//             aggregationLogic.value1 = { $sum: selectedAttribute };
//         }

//         // ** 📌 Apply Grouping for All Non-"5 Minute" Resolutions **
//         pipeline.push({
//             $group: {
//                 _id: groupByField,
//                 value1: aggregationLogic.value1,
//                 Plant: { $first: "$Plant" },
//                 Strings: { $first: "$Strings" },
//                 mppt: { $first: "$MPPT" },
//             },
//         });

//         pipeline.push({ $sort: { "_id.timestamp": 1 } });
//     }

//     // ** Execute Aggregation Query **
//     const results = await this.finalFormatModel.aggregate(pipeline);
//     const output: { timestamp: string; values: any[] }[] = [];
//     console.log("Aggregation Results:", results); // 🔍 Log results

// if (!results.length) {
//     console.error("🚨 No data returned from MongoDB Aggregation Pipeline!");
// }

//     if (results.length) {
//         results.forEach((result) => {
//             output.push({
//                 timestamp: result._id, // 🔹 Ensuring timestamp is included
//                 values: result.values.map((value: any) => ({
//                     sn: value.sn,
//                     value1: value.value1 ?? 0,
//                     Plant: value.Plant || "",
//                     Strings: value.Strings || "",
//                     mppt: value.mppt || "",
//                 })),
//             });
//         });
//     } else {
//         output.push({
//             timestamp: startDateObj.toISOString().replace("T", " ").split(".")[0],
//             values: [{ sn: "Unknown", value1: 0.0, Plant: "", Strings: "", mppt: "" }],
//         });
//     }

//     return output;
// }



  
  
  
  

