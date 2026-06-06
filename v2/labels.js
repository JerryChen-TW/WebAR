// YOLOv8 COCO 80 classes (index order matches model output)
const COCO_CLASSES = [
  "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
  "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
  "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
  "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
  "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
  "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
  "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair",
  "couch","potted plant","bed","dining table","toilet","tv","laptop","mouse",
  "remote","keyboard","cell phone","microwave","oven","toaster","sink",
  "refrigerator","book","clock","vase","scissors","teddy bear","hair drier",
  "toothbrush"
];

const TRANSLATIONS = {
  en:      ["Person","Bicycle","Car","Motorcycle","Airplane","Bus","Train","Truck","Boat","Traffic Light","Fire Hydrant","Stop Sign","Parking Meter","Bench","Bird","Cat","Dog","Horse","Sheep","Cow","Elephant","Bear","Zebra","Giraffe","Backpack","Umbrella","Handbag","Tie","Suitcase","Frisbee","Skis","Snowboard","Sports Ball","Kite","Baseball Bat","Baseball Glove","Skateboard","Surfboard","Tennis Racket","Bottle","Wine Glass","Cup","Fork","Knife","Spoon","Bowl","Banana","Apple","Sandwich","Orange","Broccoli","Carrot","Hot Dog","Pizza","Donut","Cake","Chair","Couch","Potted Plant","Bed","Dining Table","Toilet","TV","Laptop","Mouse","Remote","Keyboard","Cell Phone","Microwave","Oven","Toaster","Sink","Refrigerator","Book","Clock","Vase","Scissors","Teddy Bear","Hair Drier","Toothbrush"],
  "zh-TW": ["人","腳踏車","汽車","機車","飛機","公車","火車","卡車","船","紅綠燈","消防栓","停止標誌","停車計時器","長椅","鳥","貓","狗","馬","羊","牛","大象","熊","斑馬","長頸鹿","背包","雨傘","手提包","領帶","行李箱","飛盤","滑雪板","單板滑雪","運動球","風箏","棒球棒","棒球手套","滑板","衝浪板","網球拍","瓶子","酒杯","杯子","叉子","刀子","湯匙","碗","香蕉","蘋果","三明治","柳橙","花椰菜","紅蘿蔔","熱狗","披薩","甜甜圈","蛋糕","椅子","沙發","盆栽","床","餐桌","馬桶","電視","筆電","滑鼠","遙控器","鍵盤","手機","微波爐","烤箱","烤麵包機","水槽","冰箱","書","時鐘","花瓶","剪刀","泰迪熊","吹風機","牙刷"],
  "zh-CN": ["人","自行车","汽车","摩托车","飞机","公共汽车","火车","卡车","船","红绿灯","消防栓","停止标志","停车计时器","长椅","鸟","猫","狗","马","羊","牛","大象","熊","斑马","长颈鹿","背包","雨伞","手提包","领带","行李箱","飞盘","滑雪板","单板滑雪","运动球","风筝","棒球棒","棒球手套","滑板","冲浪板","网球拍","瓶子","酒杯","杯子","叉子","刀子","汤匙","碗","香蕉","苹果","三明治","橘子","花椰菜","胡萝卜","热狗","比萨","甜甜圈","蛋糕","椅子","沙发","盆栽","床","餐桌","马桶","电视","笔记本","鼠标","遥控器","键盘","手机","微波炉","烤箱","烤面包机","水槽","冰箱","书","时钟","花瓶","剪刀","泰迪熊","吹风机","牙刷"],
  ja:      ["人","自転車","車","バイク","飛行機","バス","電車","トラック","ボート","信号機","消火栓","一時停止","パーキングメーター","ベンチ","鳥","猫","犬","馬","羊","牛","象","熊","シマウマ","キリン","リュック","傘","ハンドバッグ","ネクタイ","スーツケース","フリスビー","スキー","スノーボード","ボール","凧","バット","グローブ","スケートボード","サーフボード","テニスラケット","ボトル","ワイングラス","カップ","フォーク","ナイフ","スプーン","ボウル","バナナ","リンゴ","サンドイッチ","オレンジ","ブロッコリー","ニンジン","ホットドッグ","ピザ","ドーナツ","ケーキ","椅子","ソファ","植木","ベッド","テーブル","トイレ","テレビ","ノートPC","マウス","リモコン","キーボード","スマホ","電子レンジ","オーブン","トースター","シンク","冷蔵庫","本","時計","花瓶","ハサミ","テディベア","ドライヤー","歯ブラシ"],
  ko:      ["사람","자전거","자동차","오토바이","비행기","버스","기차","트럭","보트","신호등","소화전","정지 표지판","주차 미터기","벤치","새","고양이","개","말","양","소","코끼리","곰","얼룩말","기린","배낭","우산","핸드백","넥타이","여행가방","프리스비","스키","스노보드","공","연","야구방망이","야구글러브","스케이트보드","서프보드","테니스라켓","병","와인잔","컵","포크","칼","숟가락","그릇","바나나","사과","샌드위치","오렌지","브로콜리","당근","핫도그","피자","도넛","케이크","의자","소파","화분","침대","식탁","변기","TV","노트북","마우스","리모컨","키보드","휴대폰","전자레인지","오븐","토스터","싱크대","냉장고","책","시계","꽃병","가위","테디베어","드라이기","칫솔"],
  es:      ["Persona","Bicicleta","Coche","Moto","Avión","Autobús","Tren","Camión","Barco","Semáforo","Hidrante","Stop","Parquímetro","Banco","Pájaro","Gato","Perro","Caballo","Oveja","Vaca","Elefante","Oso","Cebra","Jirafa","Mochila","Paraguas","Bolso","Corbata","Maleta","Frisbee","Esquís","Snowboard","Pelota","Cometa","Bate","Guante","Monopatín","Tabla surf","Raqueta","Botella","Copa vino","Taza","Tenedor","Cuchillo","Cuchara","Cuenco","Plátano","Manzana","Sándwich","Naranja","Brócoli","Zanahoria","Perrito","Pizza","Dona","Pastel","Silla","Sofá","Planta","Cama","Mesa","Inodoro","Televisión","Portátil","Ratón","Mando","Teclado","Móvil","Microondas","Horno","Tostadora","Fregadero","Nevera","Libro","Reloj","Jarrón","Tijeras","Peluche","Secador","Cepillo"],
  fr:      ["Personne","Vélo","Voiture","Moto","Avion","Bus","Train","Camion","Bateau","Feu","Bouche incendie","Stop","Parcmètre","Banc","Oiseau","Chat","Chien","Cheval","Mouton","Vache","Éléphant","Ours","Zèbre","Girafe","Sac à dos","Parapluie","Sac à main","Cravate","Valise","Frisbee","Skis","Snowboard","Ballon","Cerf-volant","Batte","Gant","Skateboard","Surf","Raquette","Bouteille","Verre vin","Tasse","Fourchette","Couteau","Cuillère","Bol","Banane","Pomme","Sandwich","Orange","Brocoli","Carotte","Hot-dog","Pizza","Beignet","Gâteau","Chaise","Canapé","Plante","Lit","Table","Toilettes","Télé","Portable","Souris","Télécommande","Clavier","Téléphone","Micro-ondes","Four","Grille-pain","Évier","Frigo","Livre","Horloge","Vase","Ciseaux","Nounours","Sèche-cheveux","Brosse dents"],
  de:      ["Person","Fahrrad","Auto","Motorrad","Flugzeug","Bus","Zug","LKW","Boot","Ampel","Hydrant","Stoppschild","Parkuhr","Bank","Vogel","Katze","Hund","Pferd","Schaf","Kuh","Elefant","Bär","Zebra","Giraffe","Rucksack","Regenschirm","Handtasche","Krawatte","Koffer","Frisbee","Skier","Snowboard","Ball","Drachen","Schläger","Handschuh","Skateboard","Surfbrett","Schläger","Flasche","Weinglas","Tasse","Gabel","Messer","Löffel","Schüssel","Banane","Apfel","Sandwich","Orange","Brokkoli","Karotte","Hot Dog","Pizza","Donut","Kuchen","Stuhl","Sofa","Pflanze","Bett","Tisch","Toilette","Fernseher","Laptop","Maus","Fernbedienung","Tastatur","Handy","Mikrowelle","Ofen","Toaster","Waschbecken","Kühlschrank","Buch","Uhr","Vase","Schere","Teddybär","Fön","Zahnbürste"]
};

const LANGUAGE_NAMES = {
  en: "English", "zh-TW": "繁體中文", "zh-CN": "简体中文",
  ja: "日本語", ko: "한국어", es: "Español", fr: "Français", de: "Deutsch"
};

function getLabel(classIdx, lang) {
  const enName  = TRANSLATIONS["en"][classIdx]  || COCO_CLASSES[classIdx] || "Unknown";
  const dict    = TRANSLATIONS[lang];
  const native  = dict ? dict[classIdx] : null;
  if (!native || lang === "en") return enName;
  return `${enName} / ${native}`;
}
