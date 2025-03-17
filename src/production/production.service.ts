import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SankeyRequestDto } from "./dto/inverter_mppt.dto";
import { SankeyRecord } from "./schemas/overall.schema";
import { SankeyData,SankeyDataDocument } from "./schemas/sankey-data.schema";
import { SankeyDataDto } from "./dto/sankey_data.dto";

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(SankeyRecord.name)
    private readonly sankeyModel: Model<SankeyRecord>,
    @InjectModel(SankeyData.name)
        private SankeyDataModel: Model<SankeyDataDocument>,
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
  
} // ✅ This was previously misplaced, now correctly closes the class
