import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SankeyRequestDto } from "./dto/inverter_mppt.dto";
import { SankeyRecord } from "./schemas/overall.schema";
import { SankeyData,SankeyDataDocument } from "./schemas/sankey-data.schema";
import { SankeyDataDto } from "./dto/sankey_data.dto";
import { SankeyDto } from "./dto/sankey.dto";
import { PlantDayRecord } from "./schemas/plant_day.schema"; // ✅ Corrected schema

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(SankeyRecord.name)
    private readonly sankeyModel: Model<SankeyRecord>,
    @InjectModel(SankeyData.name)
        private SankeyDataModel: Model<SankeyDataDocument>,

    @InjectModel(PlantDayRecord.name)
    private readonly plantDayModel: Model<PlantDayRecord>
  ) {}

  async getSankeyData(payload: SankeyRequestDto): Promise<any> {
    try {
      const { Plant, devId, startDate, endDate } = payload;

      // Convert date formats
      const startDateStr = new Date(startDate).toISOString().split("T")[0];
      const endDateStr = new Date(endDate).toISOString().split("T")[0];

      // Query MongoDB for records within date range
      const records = await this.sankeyModel.find({
        "dataItemMap.Plant": Plant,
        "dataItemMap.sn": devId,
        timestamp: { $gte: startDateStr, $lte: endDateStr },
      });

      let totalValue = 0;
      const mpptValues: Record<string, number> = {};
      const stringValues: Record<string, number> = {};

      records.forEach((record) => {
        const dataMap = record.dataItemMap || {};
        const P_abd = dataMap.P_abd || 0;
        const mppt = dataMap.MPPT || "Unknown";
        const string = dataMap.Strings || "Unknown";
        const sn = dataMap.sn || "Unknown";

        if (string === "General Tags") return;

        totalValue += P_abd;

        if (!mpptValues[mppt]) {
          mpptValues[mppt] = 0;
        }
        mpptValues[mppt] += P_abd;

        const key = `${sn}-${mppt}-${string}`;
        if (!stringValues[key]) {
          stringValues[key] = 0;
        }
        stringValues[key] += P_abd;
      });

      // Prepare Sankey Data
      const sankeyData: { source: string; target: string; value: number }[] =
        [];

      // MPPT Nodes
      for (const [mppt, value] of Object.entries(mpptValues)) {
        sankeyData.push({
          source: `[bold]Device ${devId}\n${Math.round(totalValue)} KW`,
          target: `[bold]${mppt}\n${Math.round(value)} KW`,
          value: Math.round(value),
        });
      }

      // String Nodes
      for (const [key, value] of Object.entries(stringValues)) {
        const [sn, mppt, string] = key.split("-");
        sankeyData.push({
          source: `[bold]${mppt}\n${Math.round(mpptValues[mppt])} KW`,
          target: `[bold]${string}\n${Math.round(value)} KW`,
          value: Math.round(value),
        });
      }

      return sankeyData;
    } catch (error) {
      console.error("Error:", error);
      throw new Error(`Error processing request: ${error.message}`);
    }
  }

  async getMppt(devId: string): Promise<any> {
    try {
      if (!devId) {
        throw new Error("devId is required");
      }

      const pipeline = [
        { $match: { "dataItemMap.sn": devId } },
        { $match: { "dataItemMap.MPPT": { $exists: true, $ne: null } } },
        { $match: { "dataItemMap.MPPT": { $type: "string" } } },
        { $group: { _id: "$dataItemMap.MPPT" } },
        { $project: { _id: 0, value: "$_id", label: "$_id" } },
      ];

      const results = await this.sankeyModel.aggregate(pipeline);
      return results;
    } catch (error) {
      throw new Error(`Error fetching MPPT data: ${error.message}`);
    }
  }

  async getDevices(station: string) {
    try {
      const pipeline = [
        { $match: { "dataItemMap.Plant": station } },
        { $group: { _id: "$dataItemMap.sn" } },
        { $project: { _id: 0, value: "$_id", label: "$_id" } },
      ];

      const results = await this.sankeyModel.aggregate(pipeline);
      return results;
    } catch (error) {
      throw new Error(`Error fetching MPPT data: ${error.message}`);
    }
  }


  async generateSankeyData(dto: SankeyDataDto) {
    const { Plant, startDate, endDate } = dto;

    if (!Plant || !startDate || !endDate) {
      throw new Error('Plant, startDate, and endDate are required.');
    }

    // Query MongoDB for the specified plant and date range
    const plantData = await this.SankeyDataModel.find({
      'dataItemMap.Plant': Plant,
      timestamp: { $gte: startDate, $lte: endDate },
    }).exec();

    // Aggregate Plant Level Data
    let totalValue = 0;
    plantData.forEach(record => {
      const P_abd = record.dataItemMap?.P_abd || 0;
      totalValue += P_abd;
    });

    // First Level Data
    const sankeyData = [
      {
        source: `[bold]${Plant}\n${Math.round(totalValue)} KW`,
        target: `[bold]Sub Plant\n${Math.round(totalValue)} KW`,
        value: Math.round(totalValue),
      },
    ];

    // Aggregate by devId
    const devIdValues: Record<string, number> = {};
    plantData.forEach(record => {
      const devId = record.dataItemMap?.sn;
      const P_abd = record.dataItemMap?.P_abd || 0;
      if (devId) {
        devIdValues[devId] = (devIdValues[devId] || 0) + P_abd;
      }
    });

    // Add devId entries to sankey data
    Object.entries(devIdValues).forEach(([devId, value]) => {
      sankeyData.push({
        source: `[bold]Sub Plant\n${Math.round(totalValue)} KW`,
        target: `[bold]${devId}\n${Math.round(value)} KW`,
        value: Math.round(value),
      });
    });

    return sankeyData;
  }
  
 // ✅ This was previously misplaced, now correctly closes the class


    async SankeyData(payload: SankeyDto): Promise<any> {
      const { options, start_date, end_date } = payload;
  
      if (!options || options.length === 0 || !options.every(opt => opt >= 1 && opt <= 5)) {
          throw new BadRequestException("Invalid options. Each must be between 1 and 5.");
      }
  
      // Convert date formats
      const startDateStr = new Date(start_date).toISOString().split("T")[0];
      const endDateStr = new Date(end_date).toISOString().split("T")[0];
  
      // ✅ Fetch data from `Plant_Day` collection
      const data = await this.plantDayModel.find({
          timestamp: { $gte: startDateStr, $lte: endDateStr }
      }).lean();
  
      if (!data.length) {
          throw new NotFoundException("No data found for the specified date range.");
      }
  
      // ✅ Aggregation variables
      let province_totals: Record<string, number> = {}; // Store power totals for each province
      let city_totals: Record<string, number> = {}; // Store power totals for each city
      let plant_totals: Record<string, { city: string, province: string, value: number }> = {}; // Store power for each plant
  
      // ✅ Data Aggregation
      for (const record of data) {
          const province = record.Province || "Unknown";
          const city = record.City || "Unknown";
          const plant = record.Plant || "Unknown";
          const power = record.dataItemMap?.inverter_power || 0;
  
          // ✅ Aggregate Province Level Data
          province_totals[province] = (province_totals[province] || 0) + power;
  
          // ✅ Aggregate City Level Data
          city_totals[city] = (city_totals[city] || 0) + power;
  
          // ✅ Aggregate Plant Level Data
          if (!plant_totals[plant]) {
              plant_totals[plant] = { city, province, value: 0 };
          }
          plant_totals[plant].value += power;
      }
  
      // ✅ Build Sankey Data
      const sankey_data: { source: string; target: string; value: number }[] = [];
      const overall_total = Object.values(province_totals).reduce((a, b) => a + b, 0).toFixed(2);
  
      // ✅ **Nationwide → Province Level (For Options 1 & 2)**
      if (options.includes(1) && options.includes(2)) {
          for (const province in province_totals) {
              sankey_data.push({
                  source: `[bold]Nationwide\n${overall_total} KW`,
                  target: `[bold]${province}\n${province_totals[province].toFixed(2)} KW`,
                  value: Number(province_totals[province].toFixed(2))
              });
          }
      }
  
      // ✅ **Province → City Level (For Options 1, 2, 3)**
      if (options.includes(1) && options.includes(2) && options.includes(3)) {
          for (const city in city_totals) {
              const province = data.find(d => d.City === city)?.Province || "Unknown"; // Find province for the city
              sankey_data.push({
                  source: `[bold]${province}\n${province_totals[province].toFixed(2)} KW`,
                  target: `[bold]${city}\n${city_totals[city].toFixed(2)} KW`,
                  value: Number(city_totals[city].toFixed(2))
              });
          }
      }
  
      // ✅ **Province → Plant Level (For Options 1, 2, 5)**
      if (options.includes(1) && options.includes(2) && options.includes(5)) {
          for (const plant in plant_totals) {
              const { province, value } = plant_totals[plant];
              sankey_data.push({
                  source: `[bold]${province}\n${province_totals[province].toFixed(2)} KW`,
                  target: `[bold]${plant}\n${value.toFixed(2)} KW`,
                  value: Number(value.toFixed(2))
              });
          }
      }
  
      // ✅ **Nationwide → City Level (For Options 1, 3, 5)**
      if (options.includes(1) && options.includes(3) && options.includes(5)) {
          for (const city in city_totals) {
              sankey_data.push({
                  source: `[bold]Nationwide\n${overall_total} KW`,
                  target: `[bold]${city}\n${city_totals[city].toFixed(2)} KW`,
                  value: Number(city_totals[city].toFixed(2))
              });
          }
      }
  
      // ✅ **Nationwide → Plant Level (For Options 1, 3, 5)**
      if (options.includes(1) && options.includes(3) && options.includes(5)) {
          for (const plant in plant_totals) {
            const city = plant_totals[plant].city;
               sankey_data.push({
                  source: `[bold]${city}\n${city_totals[city].toFixed(2)} KW`,
                  target: `[bold]${plant}\n${plant_totals[plant].value.toFixed(2)} KW`,
                  value: Number(plant_totals[plant].value.toFixed(2))
              });
          }
      }
  
      // ✅ **City → Plant Level Mapping (For Option 5)**
      if (options.includes(5)) {
          for (const plant in plant_totals) {
              const city = plant_totals[plant].city;
              // sankey_data.push({
              //     source: `[bold]${city}\n${city_totals[city].toFixed(2)} KW`,
              //     target: `[bold]${plant}\n${plant_totals[plant].value.toFixed(2)} KW`,
              //     value: Number(plant_totals[plant].value.toFixed(2))
              // });
          }
      }
  
      return sankey_data;
  }

  
  
  }
  
  
  
  
  
  
