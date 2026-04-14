/**
 * 数据来源标注 — 在 AI 回复 HTML 中为可验证的星盘数据添加 ✓ 徽章
 *
 * 当 AI 文本引用了与真实排盘数据一致的行星位置、宫位、八字等信息时，
 * 在该引用旁追加一个 ✓ 标记，向用户证明数据来自精确计算。
 */

interface PlanetInfo {
  name: string;
  sign: string;
  degree: number;
  house: number;
}

const BADGE = '<span class="data-badge" title="来自精确排盘计算">✓</span>';

/**
 * 从 allChartData 中提取行星查找表
 */
function buildPlanetMap(chartData: Record<string, unknown>): Map<string, PlanetInfo> {
  const map = new Map<string, PlanetInfo>();
  const natal = chartData.natalChart as { planets?: PlanetInfo[] } | undefined;
  if (!natal?.planets) return map;
  for (const p of natal.planets) {
    map.set(p.name, p);
  }
  return map;
}

/**
 * 从 allChartData 中提取八字四柱
 */
function getBaziPillars(chartData: Record<string, unknown>): string[] {
  const bazi = chartData.bazi as { fourPillars?: { year: { ganZhi: string }; month: { ganZhi: string }; day: { ganZhi: string }; time: { ganZhi: string } } } | undefined;
  if (!bazi?.fourPillars) return [];
  const fp = bazi.fourPillars;
  return [fp.year.ganZhi, fp.month.ganZhi, fp.day.ganZhi, fp.time.ganZhi];
}

/**
 * 对 HTML 中的星盘数据引用添加验证徽章
 *
 * 匹配模式:
 * 1. "行星名+星座+度数" — 如 "金星天秤17°" 或 "金星 天秤座 17°"
 * 2. "第X宫" — 如 "第7宫"
 * 3. 八字干支 — 如 "甲子"、"丙寅"
 */
export function annotateDataRefs(html: string, chartData: Record<string, unknown> | null): string {
  if (!chartData) return html;

  const planetMap = buildPlanetMap(chartData);
  const baziPillars = getBaziPillars(chartData);
  const annotated = new Set<string>(); // 避免重复标注

  let result = html;

  // 1. 行星名+星座+度数 — "金星天秤17°" / "金星 天秤座 17°12'"
  for (const [name, info] of planetMap) {
    if (annotated.has(`planet-${name}`)) continue;
    // 匹配: 行星名 (可选空格) 星座名(可选"座") (可选空格) 度数°
    const signBase = info.sign.replace(/座$/, '');
    const pattern = new RegExp(
      `(${escapeRegex(name)}\\s*${escapeRegex(signBase)}座?\\s*${info.degree}°[^<]*)`,
      'g'
    );
    const before = result;
    result = result.replace(pattern, (match) => {
      if (match.includes('data-badge')) return match; // 已标注
      return match + BADGE;
    });
    if (result !== before) annotated.add(`planet-${name}`);
  }

  // 2. "第X宫" — 验证该宫位是否存在于数据中
  const natal = chartData.natalChart as { houses?: { number: number }[] } | undefined;
  if (natal?.houses) {
    const houseNumbers = new Set(natal.houses.map(h => h.number));
    result = result.replace(/第(\d{1,2})宫/g, (match, numStr) => {
      const num = parseInt(numStr, 10);
      if (!houseNumbers.has(num)) return match;
      const key = `house-${num}`;
      if (annotated.has(key)) return match;
      annotated.add(key);
      return match + BADGE;
    });
  }

  // 3. 八字干支 — 在文本中匹配完整的干支组合
  for (const pillar of baziPillars) {
    if (annotated.has(`bazi-${pillar}`)) continue;
    const pattern = new RegExp(`(${escapeRegex(pillar)})(?!<)`, 'g');
    let matched = false;
    result = result.replace(pattern, (match) => {
      if (matched) return match; // 只标注第一个
      if (match.includes('data-badge')) return match;
      matched = true;
      return match + BADGE;
    });
    if (matched) annotated.add(`bazi-${pillar}`);
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
