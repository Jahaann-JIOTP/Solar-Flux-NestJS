import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OverallData } from './schemas/overall-data.schema';

@Injectable()
export class SolarAnalyticsService {
  constructor(@InjectModel(OverallData.name) private readonly overallDataModel: Model<OverallData>) {}

  async getStrings(Plant: string,devId: string, mppt: string) {
    try {
      const pipeline = [
        { 
          $match: { 
            'dataItemMap.Plant': Plant,  // Plant ke basis par filter
            'dataItemMap.sn': devId, 
            'dataItemMap.MPPT': mppt 
          } 
        },
        { $group: { _id: '$dataItemMap.Strings' } },
        {
          $project: {
            _id: 0,
            value: '$_id',
            label: '$_id',
          },
        },
      ];

      const results = await this.overallDataModel.aggregate(pipeline).exec();
      return results;
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
