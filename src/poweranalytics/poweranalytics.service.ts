// power.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GmHourly,GmHourlyDocument } from './schemas/gm-hourly.schema';
import { CalculatePowerDto } from './dto/calculate-power.dto';
import { CalculatePowerDayDto } from './dto/active_power_day.dto';
import { CalculatePowerWeekDto } from './dto/active_power_weekday.dto';

@Injectable()
export class PowerService {
  constructor(@InjectModel(GmHourly.name) private readonly gmHourlyModel: Model<GmHourlyDocument>) {}
// Tab 1  HOUR WISE CONSUMPTION
  async calculateActivePower(payload: CalculatePowerDto) {
    try {
      const { start_date, end_date, peakhour, nonpeakhour, plant } = payload;

      if (!start_date || !end_date) {
        throw new HttpException('start_date and end_date are required', HttpStatus.BAD_REQUEST);
      }

      const pipeline = [
        { $match: { Day: { $gte: start_date, $lte: end_date }, Plant: plant } },
        { $project: { hour: { $arrayElemAt: [{ $split: ['$Day_Hour', ' '] }, 1] }, active_power: 1 } },
        { $group: { _id: '$hour', average_active_power: { $sum: '$active_power' } } },
        { $sort: { _id: 1 as 1 } }
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      return {
        data: results.map(result => {
          const hour = result._id.padStart(2, '0');
          const averagePower = result.average_active_power;
          const hourInt = parseInt(hour, 10);
          const costMultiplier = (hourInt >= 0 && hourInt <= 18) || hourInt === 23 ? nonpeakhour : (hourInt >= 19 && hourInt <= 22 ? peakhour : 0);
          const cost = averagePower * costMultiplier;

          return {
            hour,
            value: parseFloat(averagePower.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
          };
        })
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
        throw new HttpException('start_date and end_date are required', HttpStatus.BAD_REQUEST);
      }

      const pipeline = [
        { $match: { Day: { $gte: start_date, $lte: end_date }, Plant: plant } },
        { $project: { hour: { $toInt: { $arrayElemAt: [{ $split: ['$Day_Hour', ' '] }, 1] } }, active_power: 1 } },
        { $project: {
            hour_range: {
              $switch: {
                branches: [
                  { case: { $lt: ['$hour', 6] }, then: '0-6' },
                  { case: { $lt: ['$hour', 12] }, then: '6-12' },
                  { case: { $lt: ['$hour', 18] }, then: '12-18' },
                  { case: { $lt: ['$hour', 24] }, then: '18-24' }
                ],
                default: 'Unknown'
              }
            },
            active_power: 1
        }},
        { $group: { _id: '$hour_range', total_active_power: { $sum: '$active_power' } } },
        { $sort: { _id: 1 as 1 } }
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);
      
      const response_data = results.map(result => {
        const hour_range = result._id;
        const total_power = result.total_active_power;
        const cost_multiplier = hour_range === '18-24' ? peakhour : nonpeakhour;
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
        throw new HttpException('start_date and end_date are required', HttpStatus.BAD_REQUEST);
      }
      if (![1, 2, 3].includes(option)) {
        throw new HttpException('Invalid option. Must be 1, 2, or 3', HttpStatus.BAD_REQUEST);
      }

      const matchStage: any = { $match: { Day: { $gte: start_date, $lte: end_date } } };
      if (plant) {
        matchStage.$match.Plant = plant;
      }
      let groupStage;
      let sortStage = { $sort: { _id: 1 } };

      if (option === 1) {
        groupStage = { $group: { _id: '$Day', total_active_power: { $sum: '$active_power' } } };
      } else if (option === 2) {
        groupStage = { $group: { _id: { $week: { $dateFromString: { dateString: '$Day' } } }, total_active_power: { $sum: '$active_power' } } };
      } else {
        groupStage = { $group: { _id: { $month: { $dateFromString: { dateString: '$Day' } } }, total_active_power: { $sum: '$active_power' } } };
      }

      const pipeline = [matchStage, groupStage, sortStage];
      const results = await this.gmHourlyModel.aggregate(pipeline);

      return {
        data: results.map(result => {
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
        })
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
        throw new HttpException('start_date and end_date are required', HttpStatus.BAD_REQUEST);
      }

      const pipeline = [
        {
          $match: {
            Day: { $gte: start_date, $lte: end_date },
            Plant: plant
          }
        },
        {
          $project: {
            weekday: { $isoDayOfWeek: { $dateFromString: { dateString: '$Day' } } },
            active_power: 1,
            aggregation_type: {
              $cond: {
                if: { $eq: [aggregation, 1] },
                then: 'sum',
                else: 'avg'
              }
            }
          }
        },
        {
          $group: {
            _id: '$weekday',
            total_active_power: {
              $sum: {
                $cond: {
                  if: { $eq: ['$aggregation_type', 'sum'] },
                  then: '$active_power',
                  else: 0
                }
              }
            },
            average_active_power: {
              $avg: {
                $cond: {
                  if: { $eq: ['$aggregation_type', 'avg'] },
                  then: '$active_power',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            total_active_power: {
              $cond: {
                if: { $eq: [aggregation, 1] },
                then: '$total_active_power',
                else: '$average_active_power'
              }
            },
            _id: 0,
            weekday: '$_id'
          }
        },
        { $sort: { weekday: 1 as 1 | -1 } }
      ];

      const results = await this.gmHourlyModel.aggregate(pipeline);

      const weekdayMap = {
        1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
        4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
      };

      const responseData = results.map(result => ({
        weekday: weekdayMap[result.weekday],
        value: parseFloat(result.total_active_power.toFixed(2))
      }));

      return { data: responseData };
      
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
