/**
 * 交叉校验脚本 — 验证三大引擎时辰一致性 + 结果完整性
 * 运行: npx tsx scripts/cross-validate.ts
 */

// 手动设置路径别名
import { resolve } from 'path';
import { pathToFileURL } from 'url';

// 直接引入（tsx 支持 TS 文件 require）
const solarTime = require('../src/lib/time/solar-time');
const bazi = require('../src/lib/engines/bazi');
const ziwei = require('../src/lib/engines/ziwei');
const astrology = require('../src/lib/engines/astrology');

interface TestCase {
  label: string;
  year: number; month: number; day: number;
  hour: number; minute: number;
  gender: '男' | '女';
  longitude: number; latitude: number;
  timezone: string;
}

const cases: TestCase[] = [
  {
    label: '北京白天 (1990-06-15 14:30)',
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    gender: '男', longitude: 116.40, latitude: 39.90, timezone: 'Asia/Shanghai',
  },
  {
    label: '夏令时测试 (1990-05-01 10:00)',
    year: 1990, month: 5, day: 1, hour: 10, minute: 0,
    gender: '女', longitude: 116.40, latitude: 39.90, timezone: 'Asia/Shanghai',
  },
  {
    label: '子时边界 (2000-01-15 23:30)',
    year: 2000, month: 1, day: 15, hour: 23, minute: 30,
    gender: '男', longitude: 116.40, latitude: 39.90, timezone: 'Asia/Shanghai',
  },
  {
    label: '新疆乌鲁木齐 (1995-08-20 16:00)',
    year: 1995, month: 8, day: 20, hour: 16, minute: 0,
    gender: '女', longitude: 87.60, latitude: 43.80, timezone: 'Asia/Urumqi',
  },
  {
    label: '凌晨出生 (1985-03-10 02:15)',
    year: 1985, month: 3, day: 10, hour: 2, minute: 15,
    gender: '男', longitude: 121.47, latitude: 31.23, timezone: 'Asia/Shanghai',
  },
];

async function run() {
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试: ${c.label}`);
    console.log('='.repeat(50));

    try {
      // 1. 时间标准化
      const timeInfo = await solarTime.standardizeTime(
        c.year, c.month, c.day, c.hour, c.minute, c.longitude, c.timezone
      );
      console.log(`  真太阳时: ${String(timeInfo.trueSolarTime.hour).padStart(2,'0')}:${String(timeInfo.trueSolarTime.minute).padStart(2,'0')}`);
      console.log(`  时辰: ${timeInfo.shichenName} (${timeInfo.shichen})`);
      console.log(`  修正量: ${timeInfo.totalCorrection.toFixed(2)} 分钟`);
      console.log(`  夏令时: ${timeInfo.isDST ? '是' : '否'}`);
      if (timeInfo.nearBoundary) console.log(`  ⚠️ ${timeInfo.boundaryWarning}`);

      // 2. 八字
      const baziChart = bazi.calculateBazi(timeInfo, c.year, c.month, c.day, c.gender);
      const p = baziChart.fourPillars;
      console.log(`  八字: ${p.year.ganZhi} ${p.month.ganZhi} ${p.day.ganZhi} ${p.time.ganZhi}`);
      console.log(`  时柱地支: ${p.time.zhi}`);

      // 3. 紫微
      const ziweiChart = ziwei.calculateZiwei(timeInfo, c.year, c.month, c.day, c.gender);
      console.log(`  紫微命主: ${ziweiChart.destinyMaster}`);
      console.log(`  紫微身主: ${ziweiChart.bodyMaster}`);
      console.log(`  五行局: ${ziweiChart.element}`);
      console.log(`  宫位数: ${ziweiChart.cells.length}`);

      // 4. 星盘
      const astroChart = astrology.calculateAstrology(timeInfo, c.latitude, c.longitude);
      const sun = astroChart.planets.find((p: any) => p.name === '太阳');
      const moon = astroChart.planets.find((p: any) => p.name === '月亮');
      console.log(`  太阳: ${sun?.sign} ${sun?.degree}°${sun?.minute}'`);
      console.log(`  月亮: ${moon?.sign} ${moon?.degree}°${moon?.minute}'`);
      console.log(`  行星数: ${astroChart.planets.length}`);
      console.log(`  相位数: ${astroChart.aspects.length}`);

      // 5. 一致性检查 — 八字时柱地支 vs 时辰
      const zhiToShichen: Record<string, string> = {
        '子': '子', '丑': '丑', '寅': '寅', '卯': '卯',
        '辰': '辰', '巳': '巳', '午': '午', '未': '未',
        '申': '申', '酉': '酉', '戌': '戌', '亥': '亥',
      };
      const baziShichen = zhiToShichen[p.time.zhi];
      if (baziShichen === timeInfo.shichen) {
        console.log(`  ✅ 八字时柱 (${p.time.zhi}) 与时辰 (${timeInfo.shichen}) 一致`);
      } else {
        console.log(`  ❌ 不一致! 八字时柱=${p.time.zhi}, 时辰=${timeInfo.shichen}`);
        failed++;
        continue;
      }

      // 6. 紫微宫位数量检查
      if (ziweiChart.cells.length === 12) {
        console.log(`  ✅ 紫微十二宫完整`);
      } else {
        console.log(`  ❌ 紫微宫位数异常: ${ziweiChart.cells.length}`);
        failed++;
        continue;
      }

      // 7. 星盘行星数量检查
      if (astroChart.planets.length === 10) {
        console.log(`  ✅ 星盘十大行星完整`);
      } else {
        console.log(`  ❌ 星盘行星数异常: ${astroChart.planets.length}`);
        failed++;
        continue;
      }

      passed++;
      console.log(`  ✅ 通过`);
    } catch (err: any) {
      console.log(`  ❌ 错误: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`结果: ${passed} 通过, ${failed} 失败 (共 ${cases.length} 个)`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

run();
