import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OverallData } from "./schemas/overall.schema";
import { GTHourly } from "./schemas/gt_hour.schema";
import * as moment from "moment";

@Injectable()
export class SldService {
  private readonly logger = new Logger(SldService.name);

  constructor(
    @InjectModel(OverallData.name) private overallDataModel: Model<OverallData>,
    @InjectModel(GTHourly.name) private gtHourlyModel: Model<GTHourly>
  ) {}

  async getOrgChartData(plant: string, options: string[], targetDate?: string) {
    try {
      const optionToTagMap = {
        current: "i",
        power: "P_abd",
        voltage: "u",
      };
  
      const tags = options.map((opt) => optionToTagMap[opt]);
      if (tags.includes(undefined)) throw new Error("Invalid option selected");
  
      const plants = plant ? [plant] : await this.overallDataModel.distinct("dataItemMap.Plant");
  
      targetDate = targetDate ? moment(targetDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
  
      const avgTemperatures = await this.gtHourlyModel.aggregate([
        { $match: { Day_Hour: { $regex: `^${targetDate}` } } },
        {
          $group: {
            _id: { sn: "$sn", Day_Hour: { $substr: ["$Day_Hour", 0, 10] } },
            average_temp: { $avg: { $round: ["$temperature", 2] } },
          },
        },
      ]);
  
      const avgTempDict = avgTemperatures.reduce((acc, item) => {
        acc[`${item._id.sn}_${item._id.Day_Hour}`] = Math.round(item.average_temp * 100) / 100;
        return acc;
      }, {});
  
      const orgChart: any[] = [];
  
      for (const plantName of plants) {
        const plantData: any = {
          name: plantName,
          title: "",
          image: "/assets/images/plant.png",
          children: [],
        };
  
        tags.forEach(tag => {
          plantData[tag] = 0;
          if (tag === "u" || tag === "i") plantData[`${tag}_count`] = 0;
        });
  
        const snList = await this.overallDataModel.distinct("dataItemMap.sn", { "dataItemMap.Plant": plantName });
  
        for (const sn of snList) {
          const snData: any = {
            name: sn,
            title: "",
            image: "/assets/images/inv.png",
            children: [],
            avg_temp: avgTempDict[`${sn}_${targetDate}`] || 0,
          };
  
          tags.forEach(tag => {
            snData[tag] = 0;
            if (tag === "u" || tag === "i") snData[`${tag}_count`] = 0;
          });
  
          const wattStringInfo = await this.sumWattString(sn);
          snData["inverter"] = wattStringInfo.totalWattString / 1000;
  
          const mpptList = await this.overallDataModel.distinct("dataItemMap.MPPT", { "dataItemMap.sn": sn });
  
          for (const mppt of mpptList) {
            const mpptData: any = {
              name: mppt,
              title: "",
              image: "/assets/images/mppt.png",
              children: [],
            };
  
            tags.forEach(tag => {
              mpptData[tag] = 0;
              if (tag === "u" || tag === "i") mpptData[`${tag}_count`] = 0;
            });
  
            const projection: any = {
              "dataItemMap.Strings": 1,
              "dataItemMap.Watt/String": 1,
              timestamp: 1,
            };
            tags.forEach(tag => projection[`dataItemMap.${tag}`] = 1);
  
            const stringDocs = await this.overallDataModel.find({
              "dataItemMap.MPPT": mppt,
              "dataItemMap.sn": sn,
              "dataItemMap.Plant": plantName,
            }, projection);
  
            const stringsData: any = {};
            for (const doc of stringDocs) {
              const stringName = doc.dataItemMap.Strings;
              const wattString = doc.dataItemMap["Watt/String"];
              const timestamp = doc.timestamp;
  
              if (!stringsData[stringName]) {
                stringsData[stringName] = {
                  name: stringName,
                  title: "",
                  image: "/assets/images/solar-mon.png",
                  watt_string: wattString,
                };
                tags.forEach(tag => stringsData[stringName][tag] = 0);
              }
  
              if (new Date(timestamp).toISOString().split("T")[0] === targetDate) {
                tags.forEach(tag => {
                  stringsData[stringName][tag] += doc.dataItemMap?.[tag] || 0;
                });
              }
            }
  
            for (const item of Object.values(stringsData)) {
              const isSunHours = tags.some(tag => tag !== "P_abd" && (item as any)[tag] > 0);
              if (!isSunHours) continue;
  
              tags.forEach(tag => {
                (item as any)[tag] = Math.round((item as any)[tag] || 0);
              });
  
              (item as any).title = tags.map(tag => `${tag === "u" ? "Voltage" : tag === "i" ? "Current" : "Power"}: ${(item as any)[tag]} ${tag === "u" ? "V" : tag === "i" ? "A" : "KW"}`).join("<br>") + `<br>Capacity: ${(item as any).watt_string} W`;
  
              mpptData.children.push(item);
  
              tags.forEach(tag => {
                if ((item as any)[tag] > 0) {
                  mpptData[tag] += (item as any)[tag];
                  if (tag === "u" || tag === "i") mpptData[`${tag}_count`] += 1;
                }
              });
            }
  
            tags.forEach(tag => {
              if (tag === "u" || tag === "i") {
                if (mpptData[`${tag}_count`] > 0) mpptData[tag] = Math.round(mpptData[tag] / mpptData[`${tag}_count`]);
              }
              mpptData[tag] = Math.round(mpptData[tag] || 0);
            });
            tags.forEach(tag => delete mpptData[`${tag}_count`]);
  
            mpptData.title = tags.map(tag => `${tag === "u" ? "Voltage" : tag === "i" ? "Current" : "Power"}: ${mpptData[tag]} ${tag === "u" ? "V" : tag === "i" ? "A" : "KW"}`).join("<br>");
  
            snData.children.push(mpptData);
  
            tags.forEach(tag => {
              if (mpptData[tag] > 0) {
                snData[tag] += mpptData[tag];
                if (tag === "u" || tag === "i") snData[`${tag}_count`] += 1;
              }
            });
          }
  
          tags.forEach(tag => {
            if (tag === "u" || tag === "i") {
              if (snData[`${tag}_count`] > 0) snData[tag] = Math.round(snData[tag] / snData[`${tag}_count`]);
            }
            snData[tag] = Math.round(snData[tag] || 0);
          });
          tags.forEach(tag => delete snData[`${tag}_count`]);
  
          snData.title = tags.map(tag => `${tag === "u" ? "Voltage" : tag === "i" ? "Current" : "Power"}: ${snData[tag]} ${tag === "u" ? "V" : tag === "i" ? "A" : "KW"}`).join("<br>") + `<br>Avg Temp: ${snData.avg_temp}°C`;
  
          plantData.children.push(snData);
  
          tags.forEach(tag => {
            if (snData[tag] > 0) {
              plantData[tag] += snData[tag];
              if (tag === "u" || tag === "i") plantData[`${tag}_count`] += 1;
            }
          });
        }
  
        tags.forEach(tag => {
          if (tag === "u" || tag === "i") {
            if (plantData[`${tag}_count`] > 0) plantData[tag] = Math.round(plantData[tag] / plantData[`${tag}_count`]);
          }
          plantData[tag] = Math.round(plantData[tag] || 0);
        });
        tags.forEach(tag => delete plantData[`${tag}_count`]);
  
        plantData.title = tags.map(tag => `${tag === "u" ? "Voltage" : tag === "i" ? "Current" : "Power"}: ${plantData[tag]} ${tag === "u" ? "V" : tag === "i" ? "A" : "KW"}`).join("<br>");
  
        orgChart.push(plantData);
      }
  
      return { status: "success", data: orgChart };
    } catch (error) {
      this.logger.error(error.message);
      return { status: "error", message: error.message };
    }
  }
  
  
  
  

  async sumWattString(sn: string) {
    return { totalWattString: 50000 }; // Dummy function, replace with actual logic
  }
}
