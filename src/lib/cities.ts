import { CityData } from '@/types';

/** 中国城市经纬度数据（覆盖全部地级及以上城市 + 海外主要城市） */
export const CITIES: CityData[] = [
  // ══════════════════════════════════════
  // 直辖市
  // ══════════════════════════════════════
  { name: '北京', province: '北京', longitude: 116.40, latitude: 39.90, timezone: 'Asia/Shanghai' },
  { name: '天津', province: '天津', longitude: 117.20, latitude: 39.13, timezone: 'Asia/Shanghai' },
  { name: '上海', province: '上海', longitude: 121.47, latitude: 31.23, timezone: 'Asia/Shanghai' },
  { name: '重庆', province: '重庆', longitude: 106.55, latitude: 29.56, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 河北
  // ══════════════════════════════════════
  { name: '石家庄', province: '河北', longitude: 114.51, latitude: 38.04, timezone: 'Asia/Shanghai' },
  { name: '唐山', province: '河北', longitude: 118.18, latitude: 39.63, timezone: 'Asia/Shanghai' },
  { name: '秦皇岛', province: '河北', longitude: 119.60, latitude: 39.94, timezone: 'Asia/Shanghai' },
  { name: '邯郸', province: '河北', longitude: 114.54, latitude: 36.63, timezone: 'Asia/Shanghai' },
  { name: '邢台', province: '河北', longitude: 114.50, latitude: 37.07, timezone: 'Asia/Shanghai' },
  { name: '保定', province: '河北', longitude: 115.47, latitude: 38.87, timezone: 'Asia/Shanghai' },
  { name: '张家口', province: '河北', longitude: 114.88, latitude: 40.82, timezone: 'Asia/Shanghai' },
  { name: '承德', province: '河北', longitude: 117.96, latitude: 40.95, timezone: 'Asia/Shanghai' },
  { name: '沧州', province: '河北', longitude: 116.84, latitude: 38.31, timezone: 'Asia/Shanghai' },
  { name: '廊坊', province: '河北', longitude: 116.68, latitude: 39.54, timezone: 'Asia/Shanghai' },
  { name: '衡水', province: '河北', longitude: 115.67, latitude: 37.74, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 山西
  // ══════════════════════════════════════
  { name: '太原', province: '山西', longitude: 112.55, latitude: 37.87, timezone: 'Asia/Shanghai' },
  { name: '大同', province: '山西', longitude: 113.30, latitude: 40.08, timezone: 'Asia/Shanghai' },
  { name: '阳泉', province: '山西', longitude: 113.58, latitude: 37.87, timezone: 'Asia/Shanghai' },
  { name: '长治', province: '山西', longitude: 113.12, latitude: 36.19, timezone: 'Asia/Shanghai' },
  { name: '晋城', province: '山西', longitude: 112.85, latitude: 35.50, timezone: 'Asia/Shanghai' },
  { name: '朔州', province: '山西', longitude: 112.43, latitude: 39.33, timezone: 'Asia/Shanghai' },
  { name: '晋中', province: '山西', longitude: 112.75, latitude: 37.69, timezone: 'Asia/Shanghai' },
  { name: '运城', province: '山西', longitude: 111.01, latitude: 35.03, timezone: 'Asia/Shanghai' },
  { name: '忻州', province: '山西', longitude: 112.73, latitude: 38.42, timezone: 'Asia/Shanghai' },
  { name: '临汾', province: '山西', longitude: 111.52, latitude: 36.09, timezone: 'Asia/Shanghai' },
  { name: '吕梁', province: '山西', longitude: 111.14, latitude: 37.52, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 内蒙古
  // ══════════════════════════════════════
  { name: '呼和浩特', province: '内蒙古', longitude: 111.75, latitude: 40.84, timezone: 'Asia/Shanghai' },
  { name: '包头', province: '内蒙古', longitude: 109.84, latitude: 40.66, timezone: 'Asia/Shanghai' },
  { name: '乌海', province: '内蒙古', longitude: 106.79, latitude: 39.66, timezone: 'Asia/Shanghai' },
  { name: '赤峰', province: '内蒙古', longitude: 118.89, latitude: 42.26, timezone: 'Asia/Shanghai' },
  { name: '通辽', province: '内蒙古', longitude: 122.26, latitude: 43.65, timezone: 'Asia/Shanghai' },
  { name: '鄂尔多斯', province: '内蒙古', longitude: 109.78, latitude: 39.61, timezone: 'Asia/Shanghai' },
  { name: '呼伦贝尔', province: '内蒙古', longitude: 119.77, latitude: 49.21, timezone: 'Asia/Shanghai' },
  { name: '巴彦淖尔', province: '内蒙古', longitude: 107.39, latitude: 40.74, timezone: 'Asia/Shanghai' },
  { name: '乌兰察布', province: '内蒙古', longitude: 113.13, latitude: 41.00, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 辽宁
  // ══════════════════════════════════════
  { name: '沈阳', province: '辽宁', longitude: 123.43, latitude: 41.80, timezone: 'Asia/Shanghai' },
  { name: '大连', province: '辽宁', longitude: 121.61, latitude: 38.91, timezone: 'Asia/Shanghai' },
  { name: '鞍山', province: '辽宁', longitude: 122.99, latitude: 41.11, timezone: 'Asia/Shanghai' },
  { name: '抚顺', province: '辽宁', longitude: 123.96, latitude: 41.88, timezone: 'Asia/Shanghai' },
  { name: '本溪', province: '辽宁', longitude: 123.77, latitude: 41.30, timezone: 'Asia/Shanghai' },
  { name: '丹东', province: '辽宁', longitude: 124.38, latitude: 40.13, timezone: 'Asia/Shanghai' },
  { name: '锦州', province: '辽宁', longitude: 121.13, latitude: 41.10, timezone: 'Asia/Shanghai' },
  { name: '营口', province: '辽宁', longitude: 122.23, latitude: 40.67, timezone: 'Asia/Shanghai' },
  { name: '阜新', province: '辽宁', longitude: 121.67, latitude: 42.02, timezone: 'Asia/Shanghai' },
  { name: '辽阳', province: '辽宁', longitude: 123.24, latitude: 41.27, timezone: 'Asia/Shanghai' },
  { name: '盘锦', province: '辽宁', longitude: 122.07, latitude: 41.12, timezone: 'Asia/Shanghai' },
  { name: '铁岭', province: '辽宁', longitude: 123.84, latitude: 42.29, timezone: 'Asia/Shanghai' },
  { name: '朝阳', province: '辽宁', longitude: 120.45, latitude: 41.57, timezone: 'Asia/Shanghai' },
  { name: '葫芦岛', province: '辽宁', longitude: 120.84, latitude: 40.71, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 吉林
  // ══════════════════════════════════════
  { name: '长春', province: '吉林', longitude: 125.32, latitude: 43.88, timezone: 'Asia/Shanghai' },
  { name: '吉林市', province: '吉林', longitude: 126.55, latitude: 43.84, timezone: 'Asia/Shanghai' },
  { name: '四平', province: '吉林', longitude: 124.35, latitude: 43.17, timezone: 'Asia/Shanghai' },
  { name: '辽源', province: '吉林', longitude: 125.14, latitude: 42.89, timezone: 'Asia/Shanghai' },
  { name: '通化', province: '吉林', longitude: 125.94, latitude: 41.73, timezone: 'Asia/Shanghai' },
  { name: '白山', province: '吉林', longitude: 126.42, latitude: 41.94, timezone: 'Asia/Shanghai' },
  { name: '松原', province: '吉林', longitude: 124.82, latitude: 45.14, timezone: 'Asia/Shanghai' },
  { name: '白城', province: '吉林', longitude: 122.84, latitude: 45.62, timezone: 'Asia/Shanghai' },
  { name: '延吉', province: '吉林', longitude: 129.51, latitude: 42.89, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 黑龙江
  // ══════════════════════════════════════
  { name: '哈尔滨', province: '黑龙江', longitude: 126.65, latitude: 45.75, timezone: 'Asia/Shanghai' },
  { name: '齐齐哈尔', province: '黑龙江', longitude: 123.97, latitude: 47.35, timezone: 'Asia/Shanghai' },
  { name: '鸡西', province: '黑龙江', longitude: 130.97, latitude: 45.30, timezone: 'Asia/Shanghai' },
  { name: '鹤岗', province: '黑龙江', longitude: 130.28, latitude: 47.33, timezone: 'Asia/Shanghai' },
  { name: '双鸭山', province: '黑龙江', longitude: 131.16, latitude: 46.65, timezone: 'Asia/Shanghai' },
  { name: '大庆', province: '黑龙江', longitude: 125.10, latitude: 46.59, timezone: 'Asia/Shanghai' },
  { name: '伊春', province: '黑龙江', longitude: 128.90, latitude: 47.73, timezone: 'Asia/Shanghai' },
  { name: '佳木斯', province: '黑龙江', longitude: 130.32, latitude: 46.80, timezone: 'Asia/Shanghai' },
  { name: '七台河', province: '黑龙江', longitude: 131.00, latitude: 45.77, timezone: 'Asia/Shanghai' },
  { name: '牡丹江', province: '黑龙江', longitude: 129.63, latitude: 44.55, timezone: 'Asia/Shanghai' },
  { name: '黑河', province: '黑龙江', longitude: 127.53, latitude: 50.24, timezone: 'Asia/Shanghai' },
  { name: '绥化', province: '黑龙江', longitude: 126.97, latitude: 46.65, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 江苏
  // ══════════════════════════════════════
  { name: '南京', province: '江苏', longitude: 118.78, latitude: 32.06, timezone: 'Asia/Shanghai' },
  { name: '无锡', province: '江苏', longitude: 120.31, latitude: 31.49, timezone: 'Asia/Shanghai' },
  { name: '徐州', province: '江苏', longitude: 117.28, latitude: 34.26, timezone: 'Asia/Shanghai' },
  { name: '常州', province: '江苏', longitude: 119.97, latitude: 31.81, timezone: 'Asia/Shanghai' },
  { name: '苏州', province: '江苏', longitude: 120.62, latitude: 31.30, timezone: 'Asia/Shanghai' },
  { name: '南通', province: '江苏', longitude: 120.86, latitude: 32.01, timezone: 'Asia/Shanghai' },
  { name: '连云港', province: '江苏', longitude: 119.18, latitude: 34.60, timezone: 'Asia/Shanghai' },
  { name: '淮安', province: '江苏', longitude: 119.02, latitude: 33.61, timezone: 'Asia/Shanghai' },
  { name: '盐城', province: '江苏', longitude: 120.16, latitude: 33.35, timezone: 'Asia/Shanghai' },
  { name: '扬州', province: '江苏', longitude: 119.41, latitude: 32.39, timezone: 'Asia/Shanghai' },
  { name: '镇江', province: '江苏', longitude: 119.45, latitude: 32.20, timezone: 'Asia/Shanghai' },
  { name: '泰州', province: '江苏', longitude: 119.92, latitude: 32.46, timezone: 'Asia/Shanghai' },
  { name: '宿迁', province: '江苏', longitude: 118.28, latitude: 33.96, timezone: 'Asia/Shanghai' },
  { name: '昆山', province: '江苏', longitude: 120.98, latitude: 31.39, timezone: 'Asia/Shanghai' },
  { name: '江阴', province: '江苏', longitude: 120.28, latitude: 31.91, timezone: 'Asia/Shanghai' },
  { name: '常熟', province: '江苏', longitude: 120.75, latitude: 31.65, timezone: 'Asia/Shanghai' },
  { name: '张家港', province: '江苏', longitude: 120.56, latitude: 31.88, timezone: 'Asia/Shanghai' },
  { name: '太仓', province: '江苏', longitude: 121.13, latitude: 31.46, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 浙江
  // ══════════════════════════════════════
  { name: '杭州', province: '浙江', longitude: 120.21, latitude: 30.25, timezone: 'Asia/Shanghai' },
  { name: '宁波', province: '浙江', longitude: 121.55, latitude: 29.87, timezone: 'Asia/Shanghai' },
  { name: '温州', province: '浙江', longitude: 120.70, latitude: 28.00, timezone: 'Asia/Shanghai' },
  { name: '嘉兴', province: '浙江', longitude: 120.76, latitude: 30.77, timezone: 'Asia/Shanghai' },
  { name: '湖州', province: '浙江', longitude: 120.09, latitude: 30.89, timezone: 'Asia/Shanghai' },
  { name: '绍兴', province: '浙江', longitude: 120.58, latitude: 30.00, timezone: 'Asia/Shanghai' },
  { name: '金华', province: '浙江', longitude: 119.65, latitude: 29.08, timezone: 'Asia/Shanghai' },
  { name: '衢州', province: '浙江', longitude: 118.87, latitude: 28.94, timezone: 'Asia/Shanghai' },
  { name: '舟山', province: '浙江', longitude: 122.21, latitude: 29.99, timezone: 'Asia/Shanghai' },
  { name: '台州', province: '浙江', longitude: 121.42, latitude: 28.66, timezone: 'Asia/Shanghai' },
  { name: '丽水', province: '浙江', longitude: 119.92, latitude: 28.45, timezone: 'Asia/Shanghai' },
  { name: '义乌', province: '浙江', longitude: 120.07, latitude: 29.31, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 安徽
  // ══════════════════════════════════════
  { name: '合肥', province: '安徽', longitude: 117.28, latitude: 31.86, timezone: 'Asia/Shanghai' },
  { name: '芜湖', province: '安徽', longitude: 118.38, latitude: 31.33, timezone: 'Asia/Shanghai' },
  { name: '蚌埠', province: '安徽', longitude: 117.39, latitude: 32.92, timezone: 'Asia/Shanghai' },
  { name: '淮南', province: '安徽', longitude: 117.02, latitude: 32.63, timezone: 'Asia/Shanghai' },
  { name: '马鞍山', province: '安徽', longitude: 118.51, latitude: 31.67, timezone: 'Asia/Shanghai' },
  { name: '淮北', province: '安徽', longitude: 116.80, latitude: 33.97, timezone: 'Asia/Shanghai' },
  { name: '铜陵', province: '安徽', longitude: 117.81, latitude: 30.95, timezone: 'Asia/Shanghai' },
  { name: '安庆', province: '安徽', longitude: 117.05, latitude: 30.53, timezone: 'Asia/Shanghai' },
  { name: '黄山', province: '安徽', longitude: 118.34, latitude: 29.71, timezone: 'Asia/Shanghai' },
  { name: '滁州', province: '安徽', longitude: 118.32, latitude: 32.30, timezone: 'Asia/Shanghai' },
  { name: '阜阳', province: '安徽', longitude: 115.81, latitude: 32.89, timezone: 'Asia/Shanghai' },
  { name: '宿州', province: '安徽', longitude: 116.96, latitude: 33.65, timezone: 'Asia/Shanghai' },
  { name: '六安', province: '安徽', longitude: 116.51, latitude: 31.74, timezone: 'Asia/Shanghai' },
  { name: '亳州', province: '安徽', longitude: 115.78, latitude: 33.85, timezone: 'Asia/Shanghai' },
  { name: '池州', province: '安徽', longitude: 117.49, latitude: 30.66, timezone: 'Asia/Shanghai' },
  { name: '宣城', province: '安徽', longitude: 118.76, latitude: 30.95, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 福建
  // ══════════════════════════════════════
  { name: '福州', province: '福建', longitude: 119.30, latitude: 26.08, timezone: 'Asia/Shanghai' },
  { name: '厦门', province: '福建', longitude: 118.09, latitude: 24.48, timezone: 'Asia/Shanghai' },
  { name: '莆田', province: '福建', longitude: 119.01, latitude: 25.43, timezone: 'Asia/Shanghai' },
  { name: '三明', province: '福建', longitude: 117.64, latitude: 26.27, timezone: 'Asia/Shanghai' },
  { name: '泉州', province: '福建', longitude: 118.68, latitude: 24.87, timezone: 'Asia/Shanghai' },
  { name: '漳州', province: '福建', longitude: 117.65, latitude: 24.51, timezone: 'Asia/Shanghai' },
  { name: '南平', province: '福建', longitude: 118.18, latitude: 26.64, timezone: 'Asia/Shanghai' },
  { name: '龙岩', province: '福建', longitude: 117.01, latitude: 25.08, timezone: 'Asia/Shanghai' },
  { name: '宁德', province: '福建', longitude: 119.53, latitude: 26.66, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 江西
  // ══════════════════════════════════════
  { name: '南昌', province: '江西', longitude: 115.86, latitude: 28.68, timezone: 'Asia/Shanghai' },
  { name: '景德镇', province: '江西', longitude: 117.18, latitude: 29.27, timezone: 'Asia/Shanghai' },
  { name: '萍乡', province: '江西', longitude: 113.85, latitude: 27.62, timezone: 'Asia/Shanghai' },
  { name: '九江', province: '江西', longitude: 115.99, latitude: 29.71, timezone: 'Asia/Shanghai' },
  { name: '新余', province: '江西', longitude: 114.93, latitude: 27.81, timezone: 'Asia/Shanghai' },
  { name: '鹰潭', province: '江西', longitude: 117.07, latitude: 28.26, timezone: 'Asia/Shanghai' },
  { name: '赣州', province: '江西', longitude: 114.94, latitude: 25.83, timezone: 'Asia/Shanghai' },
  { name: '吉安', province: '江西', longitude: 114.99, latitude: 27.11, timezone: 'Asia/Shanghai' },
  { name: '宜春', province: '江西', longitude: 114.39, latitude: 27.80, timezone: 'Asia/Shanghai' },
  { name: '抚州', province: '江西', longitude: 116.36, latitude: 27.95, timezone: 'Asia/Shanghai' },
  { name: '上饶', province: '江西', longitude: 117.97, latitude: 28.45, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 山东
  // ══════════════════════════════════════
  { name: '济南', province: '山东', longitude: 117.02, latitude: 36.67, timezone: 'Asia/Shanghai' },
  { name: '青岛', province: '山东', longitude: 120.38, latitude: 36.07, timezone: 'Asia/Shanghai' },
  { name: '淄博', province: '山东', longitude: 118.05, latitude: 36.81, timezone: 'Asia/Shanghai' },
  { name: '枣庄', province: '山东', longitude: 117.32, latitude: 34.81, timezone: 'Asia/Shanghai' },
  { name: '东营', province: '山东', longitude: 118.67, latitude: 37.43, timezone: 'Asia/Shanghai' },
  { name: '烟台', province: '山东', longitude: 121.45, latitude: 37.46, timezone: 'Asia/Shanghai' },
  { name: '潍坊', province: '山东', longitude: 119.16, latitude: 36.71, timezone: 'Asia/Shanghai' },
  { name: '济宁', province: '山东', longitude: 116.59, latitude: 35.41, timezone: 'Asia/Shanghai' },
  { name: '泰安', province: '山东', longitude: 117.09, latitude: 36.19, timezone: 'Asia/Shanghai' },
  { name: '威海', province: '山东', longitude: 122.12, latitude: 37.51, timezone: 'Asia/Shanghai' },
  { name: '日照', province: '山东', longitude: 119.53, latitude: 35.42, timezone: 'Asia/Shanghai' },
  { name: '临沂', province: '山东', longitude: 118.36, latitude: 35.10, timezone: 'Asia/Shanghai' },
  { name: '德州', province: '山东', longitude: 116.36, latitude: 37.44, timezone: 'Asia/Shanghai' },
  { name: '聊城', province: '山东', longitude: 115.99, latitude: 36.46, timezone: 'Asia/Shanghai' },
  { name: '滨州', province: '山东', longitude: 118.02, latitude: 37.38, timezone: 'Asia/Shanghai' },
  { name: '菏泽', province: '山东', longitude: 115.48, latitude: 35.23, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 河南
  // ══════════════════════════════════════
  { name: '郑州', province: '河南', longitude: 113.65, latitude: 34.76, timezone: 'Asia/Shanghai' },
  { name: '开封', province: '河南', longitude: 114.35, latitude: 34.79, timezone: 'Asia/Shanghai' },
  { name: '洛阳', province: '河南', longitude: 112.45, latitude: 34.62, timezone: 'Asia/Shanghai' },
  { name: '平顶山', province: '河南', longitude: 113.19, latitude: 33.77, timezone: 'Asia/Shanghai' },
  { name: '安阳', province: '河南', longitude: 114.39, latitude: 36.10, timezone: 'Asia/Shanghai' },
  { name: '鹤壁', province: '河南', longitude: 114.30, latitude: 35.75, timezone: 'Asia/Shanghai' },
  { name: '新乡', province: '河南', longitude: 113.88, latitude: 35.30, timezone: 'Asia/Shanghai' },
  { name: '焦作', province: '河南', longitude: 113.24, latitude: 35.22, timezone: 'Asia/Shanghai' },
  { name: '濮阳', province: '河南', longitude: 115.03, latitude: 35.76, timezone: 'Asia/Shanghai' },
  { name: '许昌', province: '河南', longitude: 113.85, latitude: 34.04, timezone: 'Asia/Shanghai' },
  { name: '漯河', province: '河南', longitude: 114.02, latitude: 33.58, timezone: 'Asia/Shanghai' },
  { name: '三门峡', province: '河南', longitude: 111.20, latitude: 34.77, timezone: 'Asia/Shanghai' },
  { name: '南阳', province: '河南', longitude: 112.53, latitude: 33.00, timezone: 'Asia/Shanghai' },
  { name: '商丘', province: '河南', longitude: 115.66, latitude: 34.41, timezone: 'Asia/Shanghai' },
  { name: '信阳', province: '河南', longitude: 114.09, latitude: 32.15, timezone: 'Asia/Shanghai' },
  { name: '周口', province: '河南', longitude: 114.70, latitude: 33.63, timezone: 'Asia/Shanghai' },
  { name: '驻马店', province: '河南', longitude: 114.02, latitude: 33.01, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 湖北
  // ══════════════════════════════════════
  { name: '武汉', province: '湖北', longitude: 114.30, latitude: 30.59, timezone: 'Asia/Shanghai' },
  { name: '黄石', province: '湖北', longitude: 115.04, latitude: 30.20, timezone: 'Asia/Shanghai' },
  { name: '十堰', province: '湖北', longitude: 110.80, latitude: 32.63, timezone: 'Asia/Shanghai' },
  { name: '宜昌', province: '湖北', longitude: 111.29, latitude: 30.69, timezone: 'Asia/Shanghai' },
  { name: '襄阳', province: '湖北', longitude: 112.14, latitude: 32.01, timezone: 'Asia/Shanghai' },
  { name: '鄂州', province: '湖北', longitude: 114.89, latitude: 30.39, timezone: 'Asia/Shanghai' },
  { name: '荆门', province: '湖北', longitude: 112.20, latitude: 31.04, timezone: 'Asia/Shanghai' },
  { name: '孝感', province: '湖北', longitude: 113.92, latitude: 30.92, timezone: 'Asia/Shanghai' },
  { name: '荆州', province: '湖北', longitude: 112.24, latitude: 30.33, timezone: 'Asia/Shanghai' },
  { name: '黄冈', province: '湖北', longitude: 114.87, latitude: 30.45, timezone: 'Asia/Shanghai' },
  { name: '咸宁', province: '湖北', longitude: 114.32, latitude: 29.84, timezone: 'Asia/Shanghai' },
  { name: '随州', province: '湖北', longitude: 113.38, latitude: 31.69, timezone: 'Asia/Shanghai' },
  { name: '恩施', province: '湖北', longitude: 109.49, latitude: 30.27, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 湖南
  // ══════════════════════════════════════
  { name: '长沙', province: '湖南', longitude: 112.94, latitude: 28.23, timezone: 'Asia/Shanghai' },
  { name: '株洲', province: '湖南', longitude: 113.13, latitude: 27.83, timezone: 'Asia/Shanghai' },
  { name: '湘潭', province: '湖南', longitude: 112.94, latitude: 27.83, timezone: 'Asia/Shanghai' },
  { name: '衡阳', province: '湖南', longitude: 112.57, latitude: 26.89, timezone: 'Asia/Shanghai' },
  { name: '邵阳', province: '湖南', longitude: 111.47, latitude: 27.24, timezone: 'Asia/Shanghai' },
  { name: '岳阳', province: '湖南', longitude: 113.13, latitude: 29.36, timezone: 'Asia/Shanghai' },
  { name: '常德', province: '湖南', longitude: 111.69, latitude: 29.04, timezone: 'Asia/Shanghai' },
  { name: '张家界', province: '湖南', longitude: 110.48, latitude: 29.12, timezone: 'Asia/Shanghai' },
  { name: '益阳', province: '湖南', longitude: 112.36, latitude: 28.55, timezone: 'Asia/Shanghai' },
  { name: '郴州', province: '湖南', longitude: 113.01, latitude: 25.77, timezone: 'Asia/Shanghai' },
  { name: '永州', province: '湖南', longitude: 111.61, latitude: 26.42, timezone: 'Asia/Shanghai' },
  { name: '怀化', province: '湖南', longitude: 110.00, latitude: 27.57, timezone: 'Asia/Shanghai' },
  { name: '娄底', province: '湖南', longitude: 112.00, latitude: 27.73, timezone: 'Asia/Shanghai' },
  { name: '湘西', province: '湖南', longitude: 109.74, latitude: 28.31, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 广东
  // ══════════════════════════════════════
  { name: '广州', province: '广东', longitude: 113.26, latitude: 23.13, timezone: 'Asia/Shanghai' },
  { name: '韶关', province: '广东', longitude: 113.59, latitude: 24.81, timezone: 'Asia/Shanghai' },
  { name: '深圳', province: '广东', longitude: 114.06, latitude: 22.55, timezone: 'Asia/Shanghai' },
  { name: '珠海', province: '广东', longitude: 113.58, latitude: 22.27, timezone: 'Asia/Shanghai' },
  { name: '汕头', province: '广东', longitude: 116.68, latitude: 23.35, timezone: 'Asia/Shanghai' },
  { name: '佛山', province: '广东', longitude: 113.12, latitude: 23.02, timezone: 'Asia/Shanghai' },
  { name: '江门', province: '广东', longitude: 113.08, latitude: 22.58, timezone: 'Asia/Shanghai' },
  { name: '湛江', province: '广东', longitude: 110.36, latitude: 21.27, timezone: 'Asia/Shanghai' },
  { name: '茂名', province: '广东', longitude: 110.93, latitude: 21.66, timezone: 'Asia/Shanghai' },
  { name: '肇庆', province: '广东', longitude: 112.47, latitude: 23.05, timezone: 'Asia/Shanghai' },
  { name: '惠州', province: '广东', longitude: 114.42, latitude: 23.11, timezone: 'Asia/Shanghai' },
  { name: '梅州', province: '广东', longitude: 116.12, latitude: 24.29, timezone: 'Asia/Shanghai' },
  { name: '汕尾', province: '广东', longitude: 115.37, latitude: 22.78, timezone: 'Asia/Shanghai' },
  { name: '河源', province: '广东', longitude: 114.70, latitude: 23.74, timezone: 'Asia/Shanghai' },
  { name: '阳江', province: '广东', longitude: 111.98, latitude: 21.86, timezone: 'Asia/Shanghai' },
  { name: '清远', province: '广东', longitude: 113.06, latitude: 23.68, timezone: 'Asia/Shanghai' },
  { name: '东莞', province: '广东', longitude: 113.75, latitude: 23.05, timezone: 'Asia/Shanghai' },
  { name: '中山', province: '广东', longitude: 113.39, latitude: 22.52, timezone: 'Asia/Shanghai' },
  { name: '潮州', province: '广东', longitude: 116.63, latitude: 23.66, timezone: 'Asia/Shanghai' },
  { name: '揭阳', province: '广东', longitude: 116.37, latitude: 23.55, timezone: 'Asia/Shanghai' },
  { name: '云浮', province: '广东', longitude: 112.04, latitude: 22.93, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 广西
  // ══════════════════════════════════════
  { name: '南宁', province: '广西', longitude: 108.37, latitude: 22.82, timezone: 'Asia/Shanghai' },
  { name: '柳州', province: '广西', longitude: 109.41, latitude: 24.33, timezone: 'Asia/Shanghai' },
  { name: '桂林', province: '广西', longitude: 110.29, latitude: 25.27, timezone: 'Asia/Shanghai' },
  { name: '梧州', province: '广西', longitude: 111.28, latitude: 23.47, timezone: 'Asia/Shanghai' },
  { name: '北海', province: '广西', longitude: 109.12, latitude: 21.48, timezone: 'Asia/Shanghai' },
  { name: '防城港', province: '广西', longitude: 108.35, latitude: 21.77, timezone: 'Asia/Shanghai' },
  { name: '钦州', province: '广西', longitude: 108.62, latitude: 21.98, timezone: 'Asia/Shanghai' },
  { name: '贵港', province: '广西', longitude: 109.60, latitude: 23.11, timezone: 'Asia/Shanghai' },
  { name: '玉林', province: '广西', longitude: 110.18, latitude: 22.65, timezone: 'Asia/Shanghai' },
  { name: '百色', province: '广西', longitude: 106.62, latitude: 23.90, timezone: 'Asia/Shanghai' },
  { name: '贺州', province: '广西', longitude: 111.57, latitude: 24.40, timezone: 'Asia/Shanghai' },
  { name: '河池', province: '广西', longitude: 108.06, latitude: 24.69, timezone: 'Asia/Shanghai' },
  { name: '来宾', province: '广西', longitude: 109.22, latitude: 23.73, timezone: 'Asia/Shanghai' },
  { name: '崇左', province: '广西', longitude: 107.36, latitude: 22.38, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 海南
  // ══════════════════════════════════════
  { name: '海口', province: '海南', longitude: 110.35, latitude: 20.02, timezone: 'Asia/Shanghai' },
  { name: '三亚', province: '海南', longitude: 109.51, latitude: 18.25, timezone: 'Asia/Shanghai' },
  { name: '三沙', province: '海南', longitude: 112.33, latitude: 16.83, timezone: 'Asia/Shanghai' },
  { name: '儋州', province: '海南', longitude: 109.58, latitude: 19.52, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 四川
  // ══════════════════════════════════════
  { name: '成都', province: '四川', longitude: 104.07, latitude: 30.57, timezone: 'Asia/Shanghai' },
  { name: '自贡', province: '四川', longitude: 104.77, latitude: 29.35, timezone: 'Asia/Shanghai' },
  { name: '攀枝花', province: '四川', longitude: 101.72, latitude: 26.58, timezone: 'Asia/Shanghai' },
  { name: '泸州', province: '四川', longitude: 105.44, latitude: 28.87, timezone: 'Asia/Shanghai' },
  { name: '德阳', province: '四川', longitude: 104.40, latitude: 31.13, timezone: 'Asia/Shanghai' },
  { name: '绵阳', province: '四川', longitude: 104.74, latitude: 31.46, timezone: 'Asia/Shanghai' },
  { name: '广元', province: '四川', longitude: 105.84, latitude: 32.44, timezone: 'Asia/Shanghai' },
  { name: '遂宁', province: '四川', longitude: 105.57, latitude: 30.53, timezone: 'Asia/Shanghai' },
  { name: '内江', province: '四川', longitude: 105.06, latitude: 29.58, timezone: 'Asia/Shanghai' },
  { name: '乐山', province: '四川', longitude: 103.77, latitude: 29.55, timezone: 'Asia/Shanghai' },
  { name: '南充', province: '四川', longitude: 106.11, latitude: 30.80, timezone: 'Asia/Shanghai' },
  { name: '眉山', province: '四川', longitude: 103.85, latitude: 30.08, timezone: 'Asia/Shanghai' },
  { name: '宜宾', province: '四川', longitude: 104.64, latitude: 28.75, timezone: 'Asia/Shanghai' },
  { name: '广安', province: '四川', longitude: 106.63, latitude: 30.47, timezone: 'Asia/Shanghai' },
  { name: '达州', province: '四川', longitude: 107.47, latitude: 31.21, timezone: 'Asia/Shanghai' },
  { name: '雅安', province: '四川', longitude: 103.04, latitude: 29.98, timezone: 'Asia/Shanghai' },
  { name: '巴中', province: '四川', longitude: 106.75, latitude: 31.87, timezone: 'Asia/Shanghai' },
  { name: '资阳', province: '四川', longitude: 104.63, latitude: 30.12, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 贵州
  // ══════════════════════════════════════
  { name: '贵阳', province: '贵州', longitude: 106.71, latitude: 26.65, timezone: 'Asia/Shanghai' },
  { name: '六盘水', province: '贵州', longitude: 104.83, latitude: 26.59, timezone: 'Asia/Shanghai' },
  { name: '遵义', province: '贵州', longitude: 106.93, latitude: 27.73, timezone: 'Asia/Shanghai' },
  { name: '安顺', province: '贵州', longitude: 105.95, latitude: 26.25, timezone: 'Asia/Shanghai' },
  { name: '毕节', province: '贵州', longitude: 105.29, latitude: 27.30, timezone: 'Asia/Shanghai' },
  { name: '铜仁', province: '贵州', longitude: 109.19, latitude: 27.73, timezone: 'Asia/Shanghai' },
  { name: '凯里', province: '贵州', longitude: 107.98, latitude: 26.57, timezone: 'Asia/Shanghai' },
  { name: '都匀', province: '贵州', longitude: 107.52, latitude: 26.26, timezone: 'Asia/Shanghai' },
  { name: '兴义', province: '贵州', longitude: 104.90, latitude: 25.09, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 云南
  // ══════════════════════════════════════
  { name: '昆明', province: '云南', longitude: 102.83, latitude: 25.02, timezone: 'Asia/Shanghai' },
  { name: '曲靖', province: '云南', longitude: 103.80, latitude: 25.49, timezone: 'Asia/Shanghai' },
  { name: '玉溪', province: '云南', longitude: 102.54, latitude: 24.35, timezone: 'Asia/Shanghai' },
  { name: '保山', province: '云南', longitude: 99.17, latitude: 25.11, timezone: 'Asia/Shanghai' },
  { name: '昭通', province: '云南', longitude: 103.72, latitude: 27.34, timezone: 'Asia/Shanghai' },
  { name: '丽江', province: '云南', longitude: 100.23, latitude: 26.88, timezone: 'Asia/Shanghai' },
  { name: '普洱', province: '云南', longitude: 100.97, latitude: 22.79, timezone: 'Asia/Shanghai' },
  { name: '临沧', province: '云南', longitude: 100.09, latitude: 23.88, timezone: 'Asia/Shanghai' },
  { name: '大理', province: '云南', longitude: 100.27, latitude: 25.59, timezone: 'Asia/Shanghai' },
  { name: '红河', province: '云南', longitude: 103.38, latitude: 23.36, timezone: 'Asia/Shanghai' },
  { name: '文山', province: '云南', longitude: 104.24, latitude: 23.37, timezone: 'Asia/Shanghai' },
  { name: '西双版纳', province: '云南', longitude: 100.80, latitude: 22.01, timezone: 'Asia/Shanghai' },
  { name: '德宏', province: '云南', longitude: 98.59, latitude: 24.43, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 西藏
  // ══════════════════════════════════════
  { name: '拉萨', province: '西藏', longitude: 91.11, latitude: 29.65, timezone: 'Asia/Shanghai' },
  { name: '日喀则', province: '西藏', longitude: 88.88, latitude: 29.27, timezone: 'Asia/Shanghai' },
  { name: '林芝', province: '西藏', longitude: 94.36, latitude: 29.65, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 陕西
  // ══════════════════════════════════════
  { name: '西安', province: '陕西', longitude: 108.94, latitude: 34.27, timezone: 'Asia/Shanghai' },
  { name: '铜川', province: '陕西', longitude: 108.94, latitude: 34.90, timezone: 'Asia/Shanghai' },
  { name: '宝鸡', province: '陕西', longitude: 107.17, latitude: 34.36, timezone: 'Asia/Shanghai' },
  { name: '咸阳', province: '陕西', longitude: 108.72, latitude: 34.33, timezone: 'Asia/Shanghai' },
  { name: '渭南', province: '陕西', longitude: 109.51, latitude: 34.50, timezone: 'Asia/Shanghai' },
  { name: '延安', province: '陕西', longitude: 109.49, latitude: 36.59, timezone: 'Asia/Shanghai' },
  { name: '汉中', province: '陕西', longitude: 107.03, latitude: 33.07, timezone: 'Asia/Shanghai' },
  { name: '榆林', province: '陕西', longitude: 109.73, latitude: 38.29, timezone: 'Asia/Shanghai' },
  { name: '安康', province: '陕西', longitude: 109.03, latitude: 32.68, timezone: 'Asia/Shanghai' },
  { name: '商洛', province: '陕西', longitude: 109.94, latitude: 33.87, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 甘肃
  // ══════════════════════════════════════
  { name: '兰州', province: '甘肃', longitude: 103.83, latitude: 36.06, timezone: 'Asia/Shanghai' },
  { name: '嘉峪关', province: '甘肃', longitude: 98.29, latitude: 39.77, timezone: 'Asia/Shanghai' },
  { name: '金昌', province: '甘肃', longitude: 102.19, latitude: 38.52, timezone: 'Asia/Shanghai' },
  { name: '白银', province: '甘肃', longitude: 104.14, latitude: 36.54, timezone: 'Asia/Shanghai' },
  { name: '天水', province: '甘肃', longitude: 105.72, latitude: 34.58, timezone: 'Asia/Shanghai' },
  { name: '武威', province: '甘肃', longitude: 102.64, latitude: 37.93, timezone: 'Asia/Shanghai' },
  { name: '张掖', province: '甘肃', longitude: 100.45, latitude: 38.93, timezone: 'Asia/Shanghai' },
  { name: '平凉', province: '甘肃', longitude: 106.67, latitude: 35.54, timezone: 'Asia/Shanghai' },
  { name: '酒泉', province: '甘肃', longitude: 98.51, latitude: 39.74, timezone: 'Asia/Shanghai' },
  { name: '庆阳', province: '甘肃', longitude: 107.64, latitude: 35.73, timezone: 'Asia/Shanghai' },
  { name: '定西', province: '甘肃', longitude: 104.63, latitude: 35.58, timezone: 'Asia/Shanghai' },
  { name: '陇南', province: '甘肃', longitude: 104.92, latitude: 33.40, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 青海
  // ══════════════════════════════════════
  { name: '西宁', province: '青海', longitude: 101.78, latitude: 36.62, timezone: 'Asia/Shanghai' },
  { name: '海东', province: '青海', longitude: 102.10, latitude: 36.50, timezone: 'Asia/Shanghai' },
  { name: '格尔木', province: '青海', longitude: 94.90, latitude: 36.42, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 宁夏
  // ══════════════════════════════════════
  { name: '银川', province: '宁夏', longitude: 106.27, latitude: 38.47, timezone: 'Asia/Shanghai' },
  { name: '石嘴山', province: '宁夏', longitude: 106.38, latitude: 39.02, timezone: 'Asia/Shanghai' },
  { name: '吴忠', province: '宁夏', longitude: 106.20, latitude: 37.99, timezone: 'Asia/Shanghai' },
  { name: '固原', province: '宁夏', longitude: 106.24, latitude: 36.02, timezone: 'Asia/Shanghai' },
  { name: '中卫', province: '宁夏', longitude: 105.20, latitude: 37.50, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 新疆（统一用北京时间 UTC+8）
  // ══════════════════════════════════════
  { name: '乌鲁木齐', province: '新疆', longitude: 87.62, latitude: 43.83, timezone: 'Asia/Shanghai' },
  { name: '克拉玛依', province: '新疆', longitude: 84.87, latitude: 45.59, timezone: 'Asia/Shanghai' },
  { name: '吐鲁番', province: '新疆', longitude: 89.18, latitude: 42.95, timezone: 'Asia/Shanghai' },
  { name: '哈密', province: '新疆', longitude: 93.51, latitude: 42.83, timezone: 'Asia/Shanghai' },
  { name: '昌吉', province: '新疆', longitude: 87.31, latitude: 44.01, timezone: 'Asia/Shanghai' },
  { name: '库尔勒', province: '新疆', longitude: 86.15, latitude: 41.76, timezone: 'Asia/Shanghai' },
  { name: '阿克苏', province: '新疆', longitude: 80.26, latitude: 41.17, timezone: 'Asia/Shanghai' },
  { name: '喀什', province: '新疆', longitude: 75.99, latitude: 39.47, timezone: 'Asia/Shanghai' },
  { name: '和田', province: '新疆', longitude: 79.93, latitude: 37.11, timezone: 'Asia/Shanghai' },
  { name: '伊宁', province: '新疆', longitude: 81.33, latitude: 43.91, timezone: 'Asia/Shanghai' },
  { name: '塔城', province: '新疆', longitude: 82.98, latitude: 46.75, timezone: 'Asia/Shanghai' },
  { name: '阿勒泰', province: '新疆', longitude: 88.14, latitude: 47.85, timezone: 'Asia/Shanghai' },
  { name: '石河子', province: '新疆', longitude: 86.08, latitude: 44.31, timezone: 'Asia/Shanghai' },
  { name: '阿拉尔', province: '新疆', longitude: 81.29, latitude: 40.55, timezone: 'Asia/Shanghai' },
  { name: '图木舒克', province: '新疆', longitude: 79.07, latitude: 39.87, timezone: 'Asia/Shanghai' },
  { name: '五家渠', province: '新疆', longitude: 87.54, latitude: 44.17, timezone: 'Asia/Shanghai' },
  { name: '北屯', province: '新疆', longitude: 87.83, latitude: 47.35, timezone: 'Asia/Shanghai' },

  // ══════════════════════════════════════
  // 特别行政区 + 台湾
  // ══════════════════════════════════════
  { name: '香港', province: '香港', longitude: 114.17, latitude: 22.28, timezone: 'Asia/Hong_Kong' },
  { name: '澳门', province: '澳门', longitude: 113.54, latitude: 22.20, timezone: 'Asia/Macau' },
  { name: '台北', province: '台湾', longitude: 121.56, latitude: 25.04, timezone: 'Asia/Taipei' },
  { name: '高雄', province: '台湾', longitude: 120.31, latitude: 22.62, timezone: 'Asia/Taipei' },
  { name: '台中', province: '台湾', longitude: 120.68, latitude: 24.15, timezone: 'Asia/Taipei' },
  { name: '台南', province: '台湾', longitude: 120.20, latitude: 23.00, timezone: 'Asia/Taipei' },
  { name: '新北', province: '台湾', longitude: 121.47, latitude: 25.01, timezone: 'Asia/Taipei' },
  { name: '桃园', province: '台湾', longitude: 121.30, latitude: 24.99, timezone: 'Asia/Taipei' },

  // ══════════════════════════════════════
  // 海外主要城市
  // ══════════════════════════════════════
  // 亚洲
  { name: '东京', province: '日本', longitude: 139.69, latitude: 35.69, timezone: 'Asia/Tokyo' },
  { name: '大阪', province: '日本', longitude: 135.50, latitude: 34.69, timezone: 'Asia/Tokyo' },
  { name: '首尔', province: '韩国', longitude: 126.98, latitude: 37.57, timezone: 'Asia/Seoul' },
  { name: '新加坡', province: '新加坡', longitude: 103.85, latitude: 1.29, timezone: 'Asia/Singapore' },
  { name: '曼谷', province: '泰国', longitude: 100.50, latitude: 13.76, timezone: 'Asia/Bangkok' },
  { name: '吉隆坡', province: '马来西亚', longitude: 101.69, latitude: 3.14, timezone: 'Asia/Kuala_Lumpur' },
  { name: '河内', province: '越南', longitude: 105.85, latitude: 21.03, timezone: 'Asia/Ho_Chi_Minh' },
  { name: '胡志明市', province: '越南', longitude: 106.63, latitude: 10.82, timezone: 'Asia/Ho_Chi_Minh' },
  { name: '马尼拉', province: '菲律宾', longitude: 120.98, latitude: 14.60, timezone: 'Asia/Manila' },
  { name: '雅加达', province: '印尼', longitude: 106.85, latitude: -6.21, timezone: 'Asia/Jakarta' },
  { name: '新德里', province: '印度', longitude: 77.21, latitude: 28.61, timezone: 'Asia/Kolkata' },
  { name: '孟买', province: '印度', longitude: 72.88, latitude: 19.08, timezone: 'Asia/Kolkata' },
  { name: '迪拜', province: '阿联酋', longitude: 55.27, latitude: 25.20, timezone: 'Asia/Dubai' },
  // 大洋洲
  { name: '悉尼', province: '澳大利亚', longitude: 151.21, latitude: -33.87, timezone: 'Australia/Sydney' },
  { name: '墨尔本', province: '澳大利亚', longitude: 144.96, latitude: -37.81, timezone: 'Australia/Melbourne' },
  { name: '奥克兰', province: '新西兰', longitude: 174.76, latitude: -36.85, timezone: 'Pacific/Auckland' },
  // 欧洲
  { name: '伦敦', province: '英国', longitude: -0.13, latitude: 51.51, timezone: 'Europe/London' },
  { name: '巴黎', province: '法国', longitude: 2.35, latitude: 48.86, timezone: 'Europe/Paris' },
  { name: '柏林', province: '德国', longitude: 13.40, latitude: 52.52, timezone: 'Europe/Berlin' },
  { name: '莫斯科', province: '俄罗斯', longitude: 37.62, latitude: 55.76, timezone: 'Europe/Moscow' },
  { name: '罗马', province: '意大利', longitude: 12.50, latitude: 41.90, timezone: 'Europe/Rome' },
  { name: '马德里', province: '西班牙', longitude: -3.70, latitude: 40.42, timezone: 'Europe/Madrid' },
  { name: '阿姆斯特丹', province: '荷兰', longitude: 4.90, latitude: 52.37, timezone: 'Europe/Amsterdam' },
  // 北美
  { name: '纽约', province: '美国', longitude: -74.01, latitude: 40.71, timezone: 'America/New_York' },
  { name: '洛杉矶', province: '美国', longitude: -118.24, latitude: 34.05, timezone: 'America/Los_Angeles' },
  { name: '旧金山', province: '美国', longitude: -122.42, latitude: 37.77, timezone: 'America/Los_Angeles' },
  { name: '芝加哥', province: '美国', longitude: -87.63, latitude: 41.88, timezone: 'America/Chicago' },
  { name: '西雅图', province: '美国', longitude: -122.33, latitude: 47.61, timezone: 'America/Los_Angeles' },
  { name: '波士顿', province: '美国', longitude: -71.06, latitude: 42.36, timezone: 'America/New_York' },
  { name: '温哥华', province: '加拿大', longitude: -123.12, latitude: 49.28, timezone: 'America/Vancouver' },
  { name: '多伦多', province: '加拿大', longitude: -79.38, latitude: 43.65, timezone: 'America/Toronto' },
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
