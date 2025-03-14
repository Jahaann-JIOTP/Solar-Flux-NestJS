import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OverallData } from './schemas/overall.schema';
import { GTHourly } from './schemas/gt_hour.schema';
import * as moment from 'moment';

@Injectable()
export class SldService {
  private readonly logger = new Logger(SldService.name);

  constructor(
    @InjectModel(OverallData.name) private overallDataModel: Model<OverallData>,
    @InjectModel(GTHourly.name) private gtHourlyModel: Model<GTHourly>,
  ) {}

  async getOrgChartData(plant: string, option: string) {
    try {
      // 🔹 **Option to Tag Mapping**
      const optionToTagMap = {
        current: 'i',
        power: 'P_abd',
        voltage: 'u',
      };

      const tag = optionToTagMap[option];
      if (!tag) throw new Error('Invalid option');

      // ✅ **Filter By Selected Plant**
      const plants = plant
        ? [plant]
        : await this.overallDataModel.distinct('dataItemMap.Plant');
      const orgChart = [];
      const targetDate = moment('2024-11-10').format('YYYY-MM-DD');

      for (const plantName of plants) {
        const plantData = {
          name: plantName,
          title: `${tag === 'u' ? 'Voltage: 0 V' : tag === 'i' ? 'Current: 0 A' : 'Power: 0 KW'}`,
          image: '/assets/images/plant.png',
          children: [],
          [tag]: 0,
        };

        const snList = await this.overallDataModel.distinct('dataItemMap.sn', {
          'dataItemMap.Plant': plantName, // ✅ **Filter by Selected Plant**
        });

        for (const sn of snList) {
          const snData = {
            name: sn,
            title: `${tag === 'u' ? 'Voltage: 0 V' : tag === 'i' ? 'Current: 0 A' : 'Power: 0 KW'}`,
            image: '/assets/images/inv.png',
            children: [],
            [tag]: 0,
          };

          const mpptList = await this.overallDataModel.distinct(
            'dataItemMap.MPPT',
            {
              'dataItemMap.sn': sn,
            },
          );

          for (const mppt of mpptList) {
            const mpptData = {
              name: mppt,
              title: `${tag === 'u' ? 'Voltage: 0 V' : tag === 'i' ? 'Current: 0 A' : 'Power: 0 KW'}`,
              image: '/assets/images/mppt.png',
              children: [],
              [tag]: 0,
            };

            // ✅ **Fetching Data for Requested Plant & Option**
            const projection = {
              'dataItemMap.Strings': 1,
              'dataItemMap.Watt/String': 1,
              timestamp: 1,
            };
            projection[`dataItemMap.${tag}`] = 1;

            const stringDocs = await this.overallDataModel.find(
              {
                'dataItemMap.MPPT': mppt,
                'dataItemMap.sn': sn,
                'dataItemMap.Plant': plantName, // ✅ **Filter by Plant**
              },
              projection,
            );

            const stringsData = {};
            for (const doc of stringDocs) {
              const stringName = doc.dataItemMap.Strings;
              const wattString = doc.dataItemMap['Watt/String'];
              const timestamp = doc.timestamp;

              if (!stringsData[stringName]) {
                stringsData[stringName] = {
                  name: stringName,
                  title: `${tag === 'u' ? 'Voltage: 0 V' : tag === 'i' ? 'Current: 0 A' : 'Power: 0 KW'}`,
                  image: '/assets/images/solar-mon.png',
                  watt_string: wattString,
                  [tag]: 0,
                };
              }

              if (
                new Date(timestamp).toISOString().split('T')[0] === targetDate
              ) {
                stringsData[stringName][tag] += doc.dataItemMap?.[tag] || 0;
              }
            }

            for (const string of Object.values(stringsData)) {
              string[tag] = Math.round(string[tag] || 0);
              string.title = `${tag === 'u' ? 'Voltage' : tag === 'i' ? 'Current' : 'Power'}: ${string[tag]} ${tag === 'u' ? 'V' : tag === 'i' ? 'A' : 'KW'}<br> Capacity: ${string.watt_string} W`;
              mpptData.children.push(string);
              mpptData[tag] += string[tag];
            }

            mpptData[tag] = Math.round(mpptData[tag] || 0);
            mpptData.title = `${tag === 'u' ? 'Voltage' : tag === 'i' ? 'Current' : 'Power'}: ${mpptData[tag]} ${tag === 'u' ? 'V' : tag === 'i' ? 'A' : 'KW'}`;

            snData.children.push(mpptData);
            snData[tag] += mpptData[tag];
          }

          snData[tag] = Math.round(snData[tag] || 0);
          snData.title = `${tag === 'u' ? 'Voltage' : tag === 'i' ? 'Current' : 'Power'}: ${snData[tag]} ${tag === 'u' ? 'V' : tag === 'i' ? 'A' : 'KW'}`;

          plantData.children.push(snData);
          plantData[tag] += snData[tag];
        }

        plantData[tag] = Math.round(plantData[tag] || 0);
        plantData.title = `${tag === 'u' ? 'Voltage' : tag === 'i' ? 'Current' : 'Power'}: ${plantData[tag]} ${tag === 'u' ? 'V' : tag === 'i' ? 'A' : 'KW'}`;

        orgChart.push(plantData);
      }

      return { status: 'success', data: orgChart };
    } catch (error) {
      this.logger.error(error.message);
      return { status: 'error', message: error.message };
    }
  }

  async sumWattString(sn: string) {
    return { totalWattString: 50000 }; // Dummy function, replace with actual logic
  }
}
