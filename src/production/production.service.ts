import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SankeyRequestDto } from './dto/inverter_mppt.dto';
import { SankeyRecord } from './schemas/overall.schema';

@Injectable()
export class ProductionService {
  constructor(@InjectModel(SankeyRecord.name) private readonly sankeyModel: Model<SankeyRecord>) {}

  async getSankeyData(payload: SankeyRequestDto): Promise<any> {
    try {
      const { Plant, devId, startDate, endDate } = payload;

      // Convert date formats
      const startDateStr = new Date(startDate).toISOString().split('T')[0];
      const endDateStr = new Date(endDate).toISOString().split('T')[0];

      // Query MongoDB for records within date range
      const records = await this.sankeyModel.find({
        'dataItemMap.Plant': Plant,
        'dataItemMap.sn': devId,
        timestamp: { $gte: startDateStr, $lte: endDateStr },
      });

      let totalValue = 0;
      const mpptValues: Record<string, number> = {};
      const stringValues: Record<string, number> = {};

      records.forEach((record) => {
        const dataMap = record.dataItemMap || {};
        const P_abd = dataMap.P_abd || 0;
        const mppt = dataMap.MPPT || 'Unknown';
        const string = dataMap.Strings || 'Unknown';
        const sn = dataMap.sn || 'Unknown';

        if (string === 'General Tags') return;

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
      const sankeyData: { source: string; target: string; value: number }[] = [];

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
        const [sn, mppt, string] = key.split('-');
        sankeyData.push({
          source: `[bold]${mppt}\n${Math.round(mpptValues[mppt])} KW`,
          target: `[bold]${string}\n${Math.round(value)} KW`,
          value: Math.round(value),
        });
      }

      return sankeyData;

    } catch (error) {
      console.error('Error:', error);
      throw new Error(`Error processing request: ${error.message}`);
    }
  }

  async getMppt(devId: string): Promise<any> {
    try {
      if (!devId) {
        throw new Error('devId is required');
      }

      const pipeline = [
        { $match: { 'dataItemMap.sn': devId } },
        { $match: { 'dataItemMap.MPPT': { $exists: true, $ne: null } } },
        { $match: { 'dataItemMap.MPPT': { $type: 'string' } } },
        { $group: { _id: '$dataItemMap.MPPT' } },
        { $project: { _id: 0, value: '$_id', label: '$_id' } },
      ];

      const results = await this.sankeyModel.aggregate(pipeline);
      return results;
    } catch (error) {
      throw new Error(`Error fetching MPPT data: ${error.message}`);
    }
  }
} // ✅ This was previously misplaced, now correctly closes the class
