import { CityData } from '@/types';

/** 中国主要城市经纬度数据（按省份排列） */
export const CITIES: CityData[] = [
  // 直辖市
  { name: '北京', province: '北京', longitude: 116.40, latitude: 39.90, timezone: 'Asia/Shanghai' },
  { name: '天津', province: '天津', longitude: 117.20, latitude: 39.13, timezone: 'Asia/Shanghai' },
  { name: '上海', province: '上海', longitude: 121.47, latitude: 31.23, timezone: 'Asia/Shanghai' },
  { name: '重庆', province: '重庆', longitude: 106.55, latitude: 29.56, timezone: 'Asia/Shanghai' },
  // 河北
  { name: '石家庄', province: '河北', longitude: 114.51, latitude: 38.04, timezone: 'Asia/Shanghai' },
  // 山西
  { name: '太原', province: '山西', longitude: 112.55, latitude: 37.87, timezone: 'Asia/Shanghai' },
  // 内蒙古
  { name: '呼和浩特', province: '内蒙古', longitude: 111.75, latitude: 40.84, timezone: 'Asia/Shanghai' },
  // 辽宁
  { name: '沈阳', province: '辽宁', longitude: 123.43, latitude: 41.80, timezone: 'Asia/Shanghai' },
  { name: '大连', province: '辽宁', longitude: 121.61, latitude: 38.91, timezone: 'Asia/Shanghai' },
  // 吉林
  { name: '长春', province: '吉林', longitude: 125.32, latitude: 43.88, timezone: 'Asia/Shanghai' },
  // 黑龙江
  { name: '哈尔滨', province: '黑龙江', longitude: 126.65, latitude: 45.75, timezone: 'Asia/Shanghai' },
  // 江苏
  { name: '南京', province: '江苏', longitude: 118.78, latitude: 32.06, timezone: 'Asia/Shanghai' },
  { name: '苏州', province: '江苏', longitude: 120.62, latitude: 31.30, timezone: 'Asia/Shanghai' },
  // 浙江
  { name: '杭州', province: '浙江', longitude: 120.21, latitude: 30.25, timezone: 'Asia/Shanghai' },
  { name: '宁波', province: '浙江', longitude: 121.55, latitude: 29.87, timezone: 'Asia/Shanghai' },
  // 安徽
  { name: '合肥', province: '安徽', longitude: 117.28, latitude: 31.86, timezone: 'Asia/Shanghai' },
  // 福建
  { name: '福州', province: '福建', longitude: 119.30, latitude: 26.08, timezone: 'Asia/Shanghai' },
  { name: '厦门', province: '福建', longitude: 118.09, latitude: 24.48, timezone: 'Asia/Shanghai' },
  // 江西
  { name: '南昌', province: '江西', longitude: 115.86, latitude: 28.68, timezone: 'Asia/Shanghai' },
  // 山东
  { name: '济南', province: '山东', longitude: 117.02, latitude: 36.67, timezone: 'Asia/Shanghai' },
  { name: '青岛', province: '山东', longitude: 120.38, latitude: 36.07, timezone: 'Asia/Shanghai' },
  // 河南
  { name: '郑州', province: '河南', longitude: 113.65, latitude: 34.76, timezone: 'Asia/Shanghai' },
  // 湖北
  { name: '武汉', province: '湖北', longitude: 114.30, latitude: 30.59, timezone: 'Asia/Shanghai' },
  // 湖南
  { name: '长沙', province: '湖南', longitude: 112.94, latitude: 28.23, timezone: 'Asia/Shanghai' },
  // 广东
  { name: '广州', province: '广东', longitude: 113.26, latitude: 23.13, timezone: 'Asia/Shanghai' },
  { name: '深圳', province: '广东', longitude: 114.06, latitude: 22.55, timezone: 'Asia/Shanghai' },
  // 广西
  { name: '南宁', province: '广西', longitude: 108.37, latitude: 22.82, timezone: 'Asia/Shanghai' },
  // 海南
  { name: '海口', province: '海南', longitude: 110.35, latitude: 20.02, timezone: 'Asia/Shanghai' },
  // 四川
  { name: '成都', province: '四川', longitude: 104.07, latitude: 30.57, timezone: 'Asia/Shanghai' },
  // 贵州
  { name: '贵阳', province: '贵州', longitude: 106.71, latitude: 26.65, timezone: 'Asia/Shanghai' },
  // 云南
  { name: '昆明', province: '云南', longitude: 102.83, latitude: 25.02, timezone: 'Asia/Shanghai' },
  // 西藏
  { name: '拉萨', province: '西藏', longitude: 91.11, latitude: 29.65, timezone: 'Asia/Shanghai' },
  // 陕西
  { name: '西安', province: '陕西', longitude: 108.94, latitude: 34.27, timezone: 'Asia/Shanghai' },
  // 甘肃
  { name: '兰州', province: '甘肃', longitude: 103.83, latitude: 36.06, timezone: 'Asia/Shanghai' },
  // 青海
  { name: '西宁', province: '青海', longitude: 101.78, latitude: 36.62, timezone: 'Asia/Shanghai' },
  // 宁夏
  { name: '银川', province: '宁夏', longitude: 106.27, latitude: 38.47, timezone: 'Asia/Shanghai' },
  // 新疆 — 注意用 UTC+6
  { name: '乌鲁木齐', province: '新疆', longitude: 87.62, latitude: 43.83, timezone: 'Asia/Urumqi' },
  { name: '阿克苏', province: '新疆', longitude: 80.26, latitude: 41.17, timezone: 'Asia/Urumqi' },
  { name: '库尔勒', province: '新疆', longitude: 86.15, latitude: 41.76, timezone: 'Asia/Urumqi' },
  { name: '伊宁', province: '新疆', longitude: 81.33, latitude: 43.91, timezone: 'Asia/Urumqi' },
  { name: '喀什', province: '新疆', longitude: 75.99, latitude: 39.47, timezone: 'Asia/Urumqi' },
  { name: '和田', province: '新疆', longitude: 79.93, latitude: 37.11, timezone: 'Asia/Urumqi' },
  { name: '哈密', province: '新疆', longitude: 93.51, latitude: 42.83, timezone: 'Asia/Urumqi' },
  { name: '克拉玛依', province: '新疆', longitude: 84.87, latitude: 45.59, timezone: 'Asia/Urumqi' },
  { name: '吐鲁番', province: '新疆', longitude: 89.18, latitude: 42.95, timezone: 'Asia/Urumqi' },
  // 特别行政区
  { name: '香港', province: '香港', longitude: 114.17, latitude: 22.28, timezone: 'Asia/Hong_Kong' },
  { name: '澳门', province: '澳门', longitude: 113.54, latitude: 22.20, timezone: 'Asia/Macau' },
  // 台湾
  { name: '台北', province: '台湾', longitude: 121.56, latitude: 25.04, timezone: 'Asia/Taipei' },
  { name: '高雄', province: '台湾', longitude: 120.31, latitude: 22.62, timezone: 'Asia/Taipei' },
];

/** 按名称模糊搜索城市 */
export function searchCity(query: string): CityData[] {
  const q = query.trim();
  if (!q) return [];
  return CITIES.filter(c => c.name.includes(q) || c.province.includes(q));
}

/** 精确获取城市 */
export function getCity(name: string): CityData | undefined {
  return CITIES.find(c => c.name === name);
}
