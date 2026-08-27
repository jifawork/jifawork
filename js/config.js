/* ============================================================
 * JifaWork · 个性化配置
 * 改这里就能改设备 / 资讯源 / 关注的博主，不用动代码
 * ============================================================ */
window.JW = {

  /* ---- GitHub Token 到期提醒（右上角徽章）----
   * 每次更换 GitHub PAT 后，把 expiry 改成新的到期日期即可。
   * 距到期 ≤30 天变黄，≤7 天变红。 */
  tokenExpiry: '2026-11-25',

  /* ---- Home Assistant 连接（默认 Demo 模式）----
   * 连接后页面会实时拉取设备状态；需在 HA 配置里开启
   * CORS 或通过反向代理暴露，否则浏览器会跨域拦截。
   * url: 例如 http://192.168.1.10:8123
   * token: HA 个人资料 → 安全 → 长期访问令牌
   * 也可以在页面上直接填，会存到浏览器本地。 */
  ha: { url: '', token: '' },

  /* ---- 房间布局（3D 平面图坐标，单位为米）---- */
  rooms: [
    { key: 'living',  name: '客厅',   x: 0,    z: 0.4,  w: 3.6, h: 2.6, color: 0x1b2440 },
    { key: 'bed',     name: '主卧',   x: 4.0,  z: 0.4,  w: 2.8, h: 2.6, color: 0x1f2240 },
    { key: 'kitchen', name: '厨房',   x: 0,    z: -3.2, w: 2.6, h: 2.2, color: 0x26203c },
    { key: 'bath',    name: '卫生间', x: 3.0,  z: -3.2, w: 1.8, h: 2.2, color: 0x1c2640 },
    { key: 'balcony', name: '阳台',   x: 5.2,  z: -3.2, w: 2.2, h: 2.2, color: 0x23304a },
  ],

  /* ---- 设备清单 ----
   * status: on=运行/开启  off=关闭  idle=待机/感应类
   * val:    Demo 模式下显示的数值
   * pos:    在房间内的相对偏移 [x, z]
   * ha:     对应 Home Assistant 的 entity_id，连接后按此匹配 */
  devices: [
    { id: 'living_ac',   name: '客厅空调',     room: 'living',  kind: 'climate',  status: 'on',   val: '26°C · 制冷',  pos: [-1.3, 0.6],  ha: 'climate.living_ac' },
    { id: 'living_light',name: '吸顶灯',       room: 'living',  kind: 'light',    status: 'on',   val: '亮度 80%',     pos: [0.5, 0.9],   ha: 'light.living_light' },
    { id: 'purifier',    name: '空气净化器',   room: 'living',  kind: 'fan',      status: 'on',   val: 'AQI 32 · 优',  pos: [-0.4, -0.8], ha: 'fan.living_purifier' },
    { id: 'robot',       name: '扫地机器人',   room: 'living',  kind: 'vacuum',   status: 'off',  val: '电量 82%',     pos: [1.0, -0.9],  ha: 'vacuum.robot' },
    { id: 'doorlock',    name: '智能门锁',     room: 'living',  kind: 'lock',     status: 'on',   val: '已上锁',       pos: [1.3, 0.9],   ha: 'lock.front_door' },
    { id: 'th_sensor',   name: '温湿度计',     room: 'living',  kind: 'sensor',   status: 'on',   val: '26.4°C / 58%', pos: [-1.4, 0.9],  ha: 'sensor.living_th' },
    { id: 'bed_ac',      name: '卧室空调',     room: 'bed',     kind: 'climate',  status: 'off',  val: '26°C · 待机',  pos: [-0.8, 0.5],  ha: 'climate.bed_ac' },
    { id: 'bed_light',   name: '床头灯',       room: 'bed',     kind: 'light',    status: 'on',   val: '亮度 40%',     pos: [0.7, 0.6],   ha: 'light.bed_light' },
    { id: 'humidifier',  name: '加湿器',       room: 'bed',     kind: 'humidifier',status: 'on',  val: '湿度 55%',     pos: [0.2, -0.6],  ha: 'humidifier.bed' },
    { id: 'fridge',      name: '卡萨帝冰箱',   room: 'kitchen', kind: 'sensor',   status: 'on',   val: '冷藏 4°C',     pos: [-0.8, 0.4],  ha: 'sensor.fridge_temp' },
    { id: 'water_pure',  name: '净水器',       room: 'kitchen', kind: 'sensor',   status: 'on',   val: 'TDS 12 · 滤芯 68%', pos: [0.7, 0.4], ha: 'sensor.water_tds' },
    { id: 'water_heat',  name: '热水器',       room: 'bath',    kind: 'sensor',   status: 'off',  val: '60°C · 保温',  pos: [0.0, 0.3],   ha: 'water_heater.bath' },
    { id: 'motion',      name: '人体传感器',   room: 'bath',    kind: 'sensor',   status: 'idle', val: '2 分钟前感应',  pos: [-0.4, -0.4], ha: 'sensor.bath_motion' },
    { id: 'washer',      name: '卡萨帝洗衣机', room: 'balcony', kind: 'switch',   status: 'off',  val: '待机',         pos: [-0.6, 0.4],  ha: 'switch.washer' },
    { id: 'curtain',     name: '智能窗帘',     room: 'balcony', kind: 'cover',    status: 'on',   val: '开合 80%',     pos: [0.7, 0.2],   ha: 'cover.living_curtain' },
  ],

  /* ---- AI 资讯源（RSS，按 tab 分组）---- */
  news: [
    { tab: '国内', label: '机器之心',   url: 'https://www.jiqizhixin.com/rss', site: 'jiqizhixin.com' },
    { tab: '国内', label: '量子位',     url: 'https://www.qbitai.com/feed',    site: 'qbitai.com' },
    { tab: '国内', label: '雷锋网',     url: 'https://www.leiphone.com/feed',  site: 'leiphone.com' },
    { tab: '海外', label: 'OpenAI',     url: 'https://openai.com/blog/rss.xml', site: 'openai.com' },
    { tab: '海外', label: 'DeepMind',   url: 'https://deepmind.google/blog/rss.xml', site: 'deepmind.google' },
    { tab: '海外', label: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', site: 'theverge.com' },
    { tab: '海外', label: 'MIT科技评论', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', site: 'technologyreview.com' },
    { tab: '海外', label: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', site: 'huggingface.co' },
    { tab: '海外', label: 'Google AI',  url: 'https://blog.google/technology/ai/rss/', site: 'blog.google' },
  ],

  /* ---- 关注的 YouTube 博主 ----
   * id: 频道 ID（以 UC 开头）。留空则按 handle 自动解析。 */
  youtubers: [
    { name: '小岛大浪吹',       handle: '@xiaodaodalang',   id: 'UCYPT3wl0MgbOz63ho166KOw' },
    { name: 'MKBHD',            handle: '@mkbhd',           id: 'UCBJycsmduvYEL83R_U4JriQ' },
    { name: 'Linus Tech Tips',  handle: '@LinusTechTips',   id: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
    { name: '影视飓风',         handle: '@mediastorm6801',  id: 'UC2cRwTuSWxxEtrRnT4lrlQA' },
    { name: 'Fireship',         handle: '@Fireship',        id: 'UCsBjURrPoezykLs9EqgamOA' },
  ],

  /* ---- RSS 代理（同源 Pages Function：/api/rss，见 functions/api/rss.js）----
   * 站内服务端抓取，无跨域限制；第三方公共代理不稳定，已弃用。 */
  proxy: '/api/rss?url=',
};
