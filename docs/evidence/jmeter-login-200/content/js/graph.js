/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
});


var responseTimePercentilesInfos = {
        data: {"result": {"minY": 67.0, "minX": 0.0, "maxY": 2307.0, "series": [{"data": [[0.0, 67.0], [0.1, 73.0], [0.2, 76.0], [0.3, 82.0], [0.4, 83.0], [0.5, 85.0], [0.6, 87.0], [0.7, 93.0], [0.8, 100.0], [0.9, 107.0], [1.0, 129.0], [1.1, 133.0], [1.2, 136.0], [1.3, 143.0], [1.4, 146.0], [1.5, 150.0], [1.6, 156.0], [1.7, 159.0], [1.8, 162.0], [1.9, 165.0], [2.0, 170.0], [2.1, 175.0], [2.2, 180.0], [2.3, 184.0], [2.4, 191.0], [2.5, 193.0], [2.6, 198.0], [2.7, 202.0], [2.8, 207.0], [2.9, 211.0], [3.0, 215.0], [3.1, 218.0], [3.2, 228.0], [3.3, 233.0], [3.4, 237.0], [3.5, 243.0], [3.6, 245.0], [3.7, 251.0], [3.8, 256.0], [3.9, 268.0], [4.0, 275.0], [4.1, 281.0], [4.2, 283.0], [4.3, 285.0], [4.4, 288.0], [4.5, 291.0], [4.6, 294.0], [4.7, 301.0], [4.8, 308.0], [4.9, 314.0], [5.0, 320.0], [5.1, 323.0], [5.2, 325.0], [5.3, 331.0], [5.4, 337.0], [5.5, 342.0], [5.6, 347.0], [5.7, 351.0], [5.8, 356.0], [5.9, 362.0], [6.0, 367.0], [6.1, 379.0], [6.2, 398.0], [6.3, 403.0], [6.4, 411.0], [6.5, 416.0], [6.6, 420.0], [6.7, 424.0], [6.8, 427.0], [6.9, 431.0], [7.0, 432.0], [7.1, 435.0], [7.2, 438.0], [7.3, 444.0], [7.4, 448.0], [7.5, 451.0], [7.6, 455.0], [7.7, 458.0], [7.8, 460.0], [7.9, 464.0], [8.0, 470.0], [8.1, 478.0], [8.2, 484.0], [8.3, 490.0], [8.4, 493.0], [8.5, 498.0], [8.6, 504.0], [8.7, 514.0], [8.8, 521.0], [8.9, 531.0], [9.0, 537.0], [9.1, 540.0], [9.2, 547.0], [9.3, 555.0], [9.4, 561.0], [9.5, 564.0], [9.6, 568.0], [9.7, 572.0], [9.8, 573.0], [9.9, 576.0], [10.0, 581.0], [10.1, 583.0], [10.2, 589.0], [10.3, 597.0], [10.4, 603.0], [10.5, 604.0], [10.6, 608.0], [10.7, 614.0], [10.8, 619.0], [10.9, 624.0], [11.0, 628.0], [11.1, 630.0], [11.2, 633.0], [11.3, 639.0], [11.4, 641.0], [11.5, 642.0], [11.6, 645.0], [11.7, 648.0], [11.8, 650.0], [11.9, 655.0], [12.0, 662.0], [12.1, 666.0], [12.2, 674.0], [12.3, 680.0], [12.4, 685.0], [12.5, 688.0], [12.6, 693.0], [12.7, 697.0], [12.8, 703.0], [12.9, 711.0], [13.0, 716.0], [13.1, 724.0], [13.2, 730.0], [13.3, 738.0], [13.4, 741.0], [13.5, 751.0], [13.6, 758.0], [13.7, 765.0], [13.8, 772.0], [13.9, 775.0], [14.0, 779.0], [14.1, 789.0], [14.2, 795.0], [14.3, 804.0], [14.4, 812.0], [14.5, 820.0], [14.6, 828.0], [14.7, 835.0], [14.8, 839.0], [14.9, 846.0], [15.0, 855.0], [15.1, 861.0], [15.2, 866.0], [15.3, 871.0], [15.4, 877.0], [15.5, 882.0], [15.6, 884.0], [15.7, 890.0], [15.8, 896.0], [15.9, 905.0], [16.0, 911.0], [16.1, 917.0], [16.2, 923.0], [16.3, 926.0], [16.4, 931.0], [16.5, 935.0], [16.6, 939.0], [16.7, 944.0], [16.8, 946.0], [16.9, 950.0], [17.0, 951.0], [17.1, 955.0], [17.2, 959.0], [17.3, 963.0], [17.4, 966.0], [17.5, 970.0], [17.6, 973.0], [17.7, 981.0], [17.8, 983.0], [17.9, 985.0], [18.0, 989.0], [18.1, 991.0], [18.2, 996.0], [18.3, 1000.0], [18.4, 1002.0], [18.5, 1004.0], [18.6, 1006.0], [18.7, 1009.0], [18.8, 1012.0], [18.9, 1013.0], [19.0, 1015.0], [19.1, 1016.0], [19.2, 1018.0], [19.3, 1019.0], [19.4, 1021.0], [19.5, 1024.0], [19.6, 1025.0], [19.7, 1026.0], [19.8, 1026.0], [19.9, 1028.0], [20.0, 1029.0], [20.1, 1030.0], [20.2, 1032.0], [20.3, 1033.0], [20.4, 1035.0], [20.5, 1036.0], [20.6, 1037.0], [20.7, 1038.0], [20.8, 1038.0], [20.9, 1039.0], [21.0, 1040.0], [21.1, 1040.0], [21.2, 1041.0], [21.3, 1042.0], [21.4, 1043.0], [21.5, 1043.0], [21.6, 1045.0], [21.7, 1046.0], [21.8, 1047.0], [21.9, 1048.0], [22.0, 1049.0], [22.1, 1050.0], [22.2, 1051.0], [22.3, 1052.0], [22.4, 1053.0], [22.5, 1053.0], [22.6, 1054.0], [22.7, 1054.0], [22.8, 1055.0], [22.9, 1055.0], [23.0, 1056.0], [23.1, 1056.0], [23.2, 1057.0], [23.3, 1057.0], [23.4, 1058.0], [23.5, 1059.0], [23.6, 1059.0], [23.7, 1060.0], [23.8, 1060.0], [23.9, 1062.0], [24.0, 1062.0], [24.1, 1063.0], [24.2, 1063.0], [24.3, 1064.0], [24.4, 1064.0], [24.5, 1065.0], [24.6, 1065.0], [24.7, 1066.0], [24.8, 1066.0], [24.9, 1067.0], [25.0, 1067.0], [25.1, 1068.0], [25.2, 1068.0], [25.3, 1069.0], [25.4, 1069.0], [25.5, 1070.0], [25.6, 1070.0], [25.7, 1070.0], [25.8, 1071.0], [25.9, 1072.0], [26.0, 1072.0], [26.1, 1073.0], [26.2, 1074.0], [26.3, 1074.0], [26.4, 1074.0], [26.5, 1074.0], [26.6, 1075.0], [26.7, 1075.0], [26.8, 1075.0], [26.9, 1076.0], [27.0, 1076.0], [27.1, 1077.0], [27.2, 1077.0], [27.3, 1077.0], [27.4, 1078.0], [27.5, 1078.0], [27.6, 1078.0], [27.7, 1079.0], [27.8, 1079.0], [27.9, 1079.0], [28.0, 1080.0], [28.1, 1080.0], [28.2, 1080.0], [28.3, 1080.0], [28.4, 1081.0], [28.5, 1082.0], [28.6, 1082.0], [28.7, 1082.0], [28.8, 1082.0], [28.9, 1083.0], [29.0, 1083.0], [29.1, 1083.0], [29.2, 1084.0], [29.3, 1084.0], [29.4, 1084.0], [29.5, 1084.0], [29.6, 1085.0], [29.7, 1085.0], [29.8, 1086.0], [29.9, 1086.0], [30.0, 1086.0], [30.1, 1087.0], [30.2, 1087.0], [30.3, 1087.0], [30.4, 1088.0], [30.5, 1088.0], [30.6, 1089.0], [30.7, 1089.0], [30.8, 1089.0], [30.9, 1090.0], [31.0, 1090.0], [31.1, 1090.0], [31.2, 1091.0], [31.3, 1091.0], [31.4, 1092.0], [31.5, 1092.0], [31.6, 1092.0], [31.7, 1092.0], [31.8, 1093.0], [31.9, 1093.0], [32.0, 1094.0], [32.1, 1094.0], [32.2, 1094.0], [32.3, 1095.0], [32.4, 1095.0], [32.5, 1095.0], [32.6, 1096.0], [32.7, 1096.0], [32.8, 1096.0], [32.9, 1097.0], [33.0, 1097.0], [33.1, 1098.0], [33.2, 1098.0], [33.3, 1098.0], [33.4, 1098.0], [33.5, 1099.0], [33.6, 1099.0], [33.7, 1099.0], [33.8, 1100.0], [33.9, 1100.0], [34.0, 1100.0], [34.1, 1100.0], [34.2, 1101.0], [34.3, 1101.0], [34.4, 1101.0], [34.5, 1101.0], [34.6, 1102.0], [34.7, 1102.0], [34.8, 1102.0], [34.9, 1102.0], [35.0, 1103.0], [35.1, 1103.0], [35.2, 1103.0], [35.3, 1104.0], [35.4, 1104.0], [35.5, 1104.0], [35.6, 1104.0], [35.7, 1105.0], [35.8, 1105.0], [35.9, 1105.0], [36.0, 1105.0], [36.1, 1106.0], [36.2, 1106.0], [36.3, 1106.0], [36.4, 1106.0], [36.5, 1107.0], [36.6, 1107.0], [36.7, 1107.0], [36.8, 1107.0], [36.9, 1107.0], [37.0, 1108.0], [37.1, 1108.0], [37.2, 1108.0], [37.3, 1108.0], [37.4, 1109.0], [37.5, 1109.0], [37.6, 1109.0], [37.7, 1109.0], [37.8, 1109.0], [37.9, 1109.0], [38.0, 1110.0], [38.1, 1110.0], [38.2, 1110.0], [38.3, 1110.0], [38.4, 1111.0], [38.5, 1111.0], [38.6, 1111.0], [38.7, 1111.0], [38.8, 1112.0], [38.9, 1112.0], [39.0, 1112.0], [39.1, 1112.0], [39.2, 1112.0], [39.3, 1113.0], [39.4, 1113.0], [39.5, 1113.0], [39.6, 1113.0], [39.7, 1114.0], [39.8, 1114.0], [39.9, 1114.0], [40.0, 1115.0], [40.1, 1115.0], [40.2, 1115.0], [40.3, 1115.0], [40.4, 1115.0], [40.5, 1115.0], [40.6, 1116.0], [40.7, 1116.0], [40.8, 1116.0], [40.9, 1116.0], [41.0, 1117.0], [41.1, 1117.0], [41.2, 1117.0], [41.3, 1117.0], [41.4, 1118.0], [41.5, 1118.0], [41.6, 1118.0], [41.7, 1118.0], [41.8, 1118.0], [41.9, 1118.0], [42.0, 1118.0], [42.1, 1119.0], [42.2, 1119.0], [42.3, 1119.0], [42.4, 1120.0], [42.5, 1120.0], [42.6, 1120.0], [42.7, 1120.0], [42.8, 1121.0], [42.9, 1121.0], [43.0, 1121.0], [43.1, 1121.0], [43.2, 1122.0], [43.3, 1122.0], [43.4, 1122.0], [43.5, 1122.0], [43.6, 1122.0], [43.7, 1123.0], [43.8, 1123.0], [43.9, 1123.0], [44.0, 1123.0], [44.1, 1124.0], [44.2, 1124.0], [44.3, 1124.0], [44.4, 1124.0], [44.5, 1125.0], [44.6, 1125.0], [44.7, 1125.0], [44.8, 1125.0], [44.9, 1125.0], [45.0, 1126.0], [45.1, 1126.0], [45.2, 1126.0], [45.3, 1126.0], [45.4, 1126.0], [45.5, 1126.0], [45.6, 1127.0], [45.7, 1127.0], [45.8, 1127.0], [45.9, 1127.0], [46.0, 1128.0], [46.1, 1128.0], [46.2, 1128.0], [46.3, 1128.0], [46.4, 1128.0], [46.5, 1129.0], [46.6, 1129.0], [46.7, 1129.0], [46.8, 1129.0], [46.9, 1130.0], [47.0, 1130.0], [47.1, 1130.0], [47.2, 1130.0], [47.3, 1131.0], [47.4, 1131.0], [47.5, 1131.0], [47.6, 1131.0], [47.7, 1132.0], [47.8, 1132.0], [47.9, 1132.0], [48.0, 1132.0], [48.1, 1133.0], [48.2, 1133.0], [48.3, 1133.0], [48.4, 1133.0], [48.5, 1134.0], [48.6, 1134.0], [48.7, 1134.0], [48.8, 1134.0], [48.9, 1134.0], [49.0, 1135.0], [49.1, 1135.0], [49.2, 1135.0], [49.3, 1135.0], [49.4, 1136.0], [49.5, 1136.0], [49.6, 1136.0], [49.7, 1136.0], [49.8, 1137.0], [49.9, 1137.0], [50.0, 1137.0], [50.1, 1137.0], [50.2, 1138.0], [50.3, 1138.0], [50.4, 1138.0], [50.5, 1138.0], [50.6, 1138.0], [50.7, 1138.0], [50.8, 1139.0], [50.9, 1139.0], [51.0, 1139.0], [51.1, 1139.0], [51.2, 1140.0], [51.3, 1140.0], [51.4, 1140.0], [51.5, 1140.0], [51.6, 1141.0], [51.7, 1141.0], [51.8, 1141.0], [51.9, 1141.0], [52.0, 1141.0], [52.1, 1142.0], [52.2, 1142.0], [52.3, 1142.0], [52.4, 1142.0], [52.5, 1142.0], [52.6, 1143.0], [52.7, 1143.0], [52.8, 1143.0], [52.9, 1143.0], [53.0, 1144.0], [53.1, 1144.0], [53.2, 1144.0], [53.3, 1144.0], [53.4, 1144.0], [53.5, 1145.0], [53.6, 1145.0], [53.7, 1145.0], [53.8, 1146.0], [53.9, 1146.0], [54.0, 1146.0], [54.1, 1147.0], [54.2, 1147.0], [54.3, 1147.0], [54.4, 1147.0], [54.5, 1148.0], [54.6, 1148.0], [54.7, 1148.0], [54.8, 1148.0], [54.9, 1148.0], [55.0, 1148.0], [55.1, 1149.0], [55.2, 1149.0], [55.3, 1149.0], [55.4, 1149.0], [55.5, 1149.0], [55.6, 1150.0], [55.7, 1150.0], [55.8, 1150.0], [55.9, 1150.0], [56.0, 1151.0], [56.1, 1151.0], [56.2, 1151.0], [56.3, 1151.0], [56.4, 1151.0], [56.5, 1152.0], [56.6, 1152.0], [56.7, 1152.0], [56.8, 1152.0], [56.9, 1153.0], [57.0, 1153.0], [57.1, 1153.0], [57.2, 1153.0], [57.3, 1153.0], [57.4, 1153.0], [57.5, 1153.0], [57.6, 1154.0], [57.7, 1154.0], [57.8, 1154.0], [57.9, 1154.0], [58.0, 1155.0], [58.1, 1155.0], [58.2, 1155.0], [58.3, 1155.0], [58.4, 1156.0], [58.5, 1156.0], [58.6, 1156.0], [58.7, 1156.0], [58.8, 1156.0], [58.9, 1157.0], [59.0, 1157.0], [59.1, 1157.0], [59.2, 1157.0], [59.3, 1158.0], [59.4, 1158.0], [59.5, 1158.0], [59.6, 1158.0], [59.7, 1158.0], [59.8, 1158.0], [59.9, 1159.0], [60.0, 1159.0], [60.1, 1159.0], [60.2, 1159.0], [60.3, 1159.0], [60.4, 1159.0], [60.5, 1160.0], [60.6, 1160.0], [60.7, 1160.0], [60.8, 1160.0], [60.9, 1160.0], [61.0, 1160.0], [61.1, 1160.0], [61.2, 1161.0], [61.3, 1161.0], [61.4, 1161.0], [61.5, 1161.0], [61.6, 1161.0], [61.7, 1162.0], [61.8, 1162.0], [61.9, 1162.0], [62.0, 1162.0], [62.1, 1163.0], [62.2, 1163.0], [62.3, 1163.0], [62.4, 1163.0], [62.5, 1163.0], [62.6, 1164.0], [62.7, 1164.0], [62.8, 1164.0], [62.9, 1164.0], [63.0, 1164.0], [63.1, 1164.0], [63.2, 1165.0], [63.3, 1165.0], [63.4, 1165.0], [63.5, 1165.0], [63.6, 1165.0], [63.7, 1166.0], [63.8, 1166.0], [63.9, 1166.0], [64.0, 1166.0], [64.1, 1166.0], [64.2, 1167.0], [64.3, 1167.0], [64.4, 1168.0], [64.5, 1168.0], [64.6, 1168.0], [64.7, 1168.0], [64.8, 1168.0], [64.9, 1169.0], [65.0, 1169.0], [65.1, 1169.0], [65.2, 1169.0], [65.3, 1169.0], [65.4, 1170.0], [65.5, 1170.0], [65.6, 1170.0], [65.7, 1170.0], [65.8, 1170.0], [65.9, 1171.0], [66.0, 1171.0], [66.1, 1171.0], [66.2, 1171.0], [66.3, 1171.0], [66.4, 1172.0], [66.5, 1172.0], [66.6, 1172.0], [66.7, 1172.0], [66.8, 1173.0], [66.9, 1173.0], [67.0, 1173.0], [67.1, 1173.0], [67.2, 1173.0], [67.3, 1173.0], [67.4, 1174.0], [67.5, 1174.0], [67.6, 1174.0], [67.7, 1174.0], [67.8, 1174.0], [67.9, 1175.0], [68.0, 1175.0], [68.1, 1175.0], [68.2, 1175.0], [68.3, 1176.0], [68.4, 1176.0], [68.5, 1176.0], [68.6, 1176.0], [68.7, 1176.0], [68.8, 1176.0], [68.9, 1177.0], [69.0, 1177.0], [69.1, 1177.0], [69.2, 1177.0], [69.3, 1178.0], [69.4, 1178.0], [69.5, 1178.0], [69.6, 1178.0], [69.7, 1178.0], [69.8, 1179.0], [69.9, 1179.0], [70.0, 1179.0], [70.1, 1179.0], [70.2, 1179.0], [70.3, 1180.0], [70.4, 1180.0], [70.5, 1180.0], [70.6, 1180.0], [70.7, 1180.0], [70.8, 1181.0], [70.9, 1181.0], [71.0, 1181.0], [71.1, 1181.0], [71.2, 1182.0], [71.3, 1182.0], [71.4, 1182.0], [71.5, 1182.0], [71.6, 1183.0], [71.7, 1183.0], [71.8, 1183.0], [71.9, 1184.0], [72.0, 1184.0], [72.1, 1184.0], [72.2, 1184.0], [72.3, 1185.0], [72.4, 1185.0], [72.5, 1185.0], [72.6, 1185.0], [72.7, 1185.0], [72.8, 1185.0], [72.9, 1186.0], [73.0, 1186.0], [73.1, 1186.0], [73.2, 1186.0], [73.3, 1186.0], [73.4, 1187.0], [73.5, 1187.0], [73.6, 1187.0], [73.7, 1187.0], [73.8, 1188.0], [73.9, 1188.0], [74.0, 1188.0], [74.1, 1188.0], [74.2, 1189.0], [74.3, 1189.0], [74.4, 1189.0], [74.5, 1190.0], [74.6, 1190.0], [74.7, 1190.0], [74.8, 1191.0], [74.9, 1191.0], [75.0, 1191.0], [75.1, 1191.0], [75.2, 1192.0], [75.3, 1192.0], [75.4, 1192.0], [75.5, 1192.0], [75.6, 1193.0], [75.7, 1193.0], [75.8, 1194.0], [75.9, 1194.0], [76.0, 1194.0], [76.1, 1194.0], [76.2, 1195.0], [76.3, 1195.0], [76.4, 1195.0], [76.5, 1195.0], [76.6, 1196.0], [76.7, 1196.0], [76.8, 1196.0], [76.9, 1197.0], [77.0, 1197.0], [77.1, 1197.0], [77.2, 1197.0], [77.3, 1198.0], [77.4, 1198.0], [77.5, 1199.0], [77.6, 1199.0], [77.7, 1199.0], [77.8, 1200.0], [77.9, 1200.0], [78.0, 1200.0], [78.1, 1200.0], [78.2, 1201.0], [78.3, 1201.0], [78.4, 1201.0], [78.5, 1201.0], [78.6, 1202.0], [78.7, 1202.0], [78.8, 1202.0], [78.9, 1203.0], [79.0, 1203.0], [79.1, 1203.0], [79.2, 1204.0], [79.3, 1204.0], [79.4, 1204.0], [79.5, 1204.0], [79.6, 1204.0], [79.7, 1205.0], [79.8, 1205.0], [79.9, 1205.0], [80.0, 1206.0], [80.1, 1206.0], [80.2, 1207.0], [80.3, 1207.0], [80.4, 1207.0], [80.5, 1207.0], [80.6, 1208.0], [80.7, 1208.0], [80.8, 1208.0], [80.9, 1208.0], [81.0, 1209.0], [81.1, 1209.0], [81.2, 1209.0], [81.3, 1209.0], [81.4, 1210.0], [81.5, 1210.0], [81.6, 1210.0], [81.7, 1211.0], [81.8, 1211.0], [81.9, 1211.0], [82.0, 1211.0], [82.1, 1212.0], [82.2, 1212.0], [82.3, 1212.0], [82.4, 1212.0], [82.5, 1213.0], [82.6, 1213.0], [82.7, 1213.0], [82.8, 1213.0], [82.9, 1214.0], [83.0, 1214.0], [83.1, 1214.0], [83.2, 1215.0], [83.3, 1215.0], [83.4, 1215.0], [83.5, 1215.0], [83.6, 1216.0], [83.7, 1216.0], [83.8, 1217.0], [83.9, 1217.0], [84.0, 1217.0], [84.1, 1218.0], [84.2, 1218.0], [84.3, 1219.0], [84.4, 1219.0], [84.5, 1220.0], [84.6, 1220.0], [84.7, 1220.0], [84.8, 1221.0], [84.9, 1221.0], [85.0, 1222.0], [85.1, 1222.0], [85.2, 1222.0], [85.3, 1223.0], [85.4, 1223.0], [85.5, 1224.0], [85.6, 1224.0], [85.7, 1225.0], [85.8, 1225.0], [85.9, 1225.0], [86.0, 1226.0], [86.1, 1226.0], [86.2, 1227.0], [86.3, 1227.0], [86.4, 1227.0], [86.5, 1228.0], [86.6, 1228.0], [86.7, 1228.0], [86.8, 1229.0], [86.9, 1229.0], [87.0, 1230.0], [87.1, 1230.0], [87.2, 1231.0], [87.3, 1231.0], [87.4, 1231.0], [87.5, 1232.0], [87.6, 1232.0], [87.7, 1232.0], [87.8, 1233.0], [87.9, 1233.0], [88.0, 1234.0], [88.1, 1234.0], [88.2, 1234.0], [88.3, 1235.0], [88.4, 1235.0], [88.5, 1236.0], [88.6, 1236.0], [88.7, 1237.0], [88.8, 1237.0], [88.9, 1238.0], [89.0, 1238.0], [89.1, 1238.0], [89.2, 1239.0], [89.3, 1239.0], [89.4, 1240.0], [89.5, 1240.0], [89.6, 1241.0], [89.7, 1241.0], [89.8, 1242.0], [89.9, 1242.0], [90.0, 1243.0], [90.1, 1244.0], [90.2, 1244.0], [90.3, 1245.0], [90.4, 1245.0], [90.5, 1246.0], [90.6, 1246.0], [90.7, 1247.0], [90.8, 1247.0], [90.9, 1248.0], [91.0, 1248.0], [91.1, 1249.0], [91.2, 1249.0], [91.3, 1250.0], [91.4, 1251.0], [91.5, 1252.0], [91.6, 1253.0], [91.7, 1253.0], [91.8, 1254.0], [91.9, 1254.0], [92.0, 1255.0], [92.1, 1255.0], [92.2, 1256.0], [92.3, 1257.0], [92.4, 1258.0], [92.5, 1258.0], [92.6, 1258.0], [92.7, 1259.0], [92.8, 1259.0], [92.9, 1260.0], [93.0, 1260.0], [93.1, 1261.0], [93.2, 1261.0], [93.3, 1262.0], [93.4, 1263.0], [93.5, 1263.0], [93.6, 1264.0], [93.7, 1265.0], [93.8, 1266.0], [93.9, 1267.0], [94.0, 1267.0], [94.1, 1268.0], [94.2, 1268.0], [94.3, 1269.0], [94.4, 1270.0], [94.5, 1271.0], [94.6, 1272.0], [94.7, 1272.0], [94.8, 1273.0], [94.9, 1274.0], [95.0, 1275.0], [95.1, 1276.0], [95.2, 1277.0], [95.3, 1278.0], [95.4, 1278.0], [95.5, 1279.0], [95.6, 1280.0], [95.7, 1280.0], [95.8, 1281.0], [95.9, 1282.0], [96.0, 1283.0], [96.1, 1284.0], [96.2, 1286.0], [96.3, 1287.0], [96.4, 1288.0], [96.5, 1290.0], [96.6, 1291.0], [96.7, 1292.0], [96.8, 1293.0], [96.9, 1294.0], [97.0, 1296.0], [97.1, 1298.0], [97.2, 1299.0], [97.3, 1301.0], [97.4, 1304.0], [97.5, 1305.0], [97.6, 1307.0], [97.7, 1310.0], [97.8, 1312.0], [97.9, 1315.0], [98.0, 1316.0], [98.1, 1321.0], [98.2, 1324.0], [98.3, 1328.0], [98.4, 1332.0], [98.5, 1334.0], [98.6, 1338.0], [98.7, 1343.0], [98.8, 1348.0], [98.9, 1355.0], [99.0, 1362.0], [99.1, 1379.0], [99.2, 1392.0], [99.3, 1409.0], [99.4, 1951.0], [99.5, 2025.0], [99.6, 2065.0], [99.7, 2084.0], [99.8, 2128.0], [99.9, 2210.0]], "isOverall": false, "label": "POST /admin/login", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

/**
 * @param elementId Id of element where we display message
 */
function setEmptyGraph(elementId) {
    $(function() {
        $(elementId).text("No graph series with filter="+seriesFilter);
    });
}

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimePercentiles");
        return;
    }
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 0.0, "maxY": 3385.0, "series": [{"data": [[0.0, 60.0], [2100.0, 11.0], [2200.0, 8.0], [2300.0, 1.0], [600.0, 187.0], [700.0, 117.0], [200.0, 153.0], [800.0, 121.0], [900.0, 188.0], [1000.0, 1188.0], [1100.0, 3385.0], [300.0, 121.0], [1200.0, 1500.0], [1300.0, 154.0], [1400.0, 10.0], [100.0, 145.0], [400.0, 177.0], [1600.0, 1.0], [1900.0, 7.0], [500.0, 138.0], [2000.0, 20.0]], "isOverall": false, "label": "POST /admin/login", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 2300.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeDistribution");
        return;
    }
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 48.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 6986.0, "series": [{"data": [[0.0, 658.0]], "color": "#9ACD32", "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[1.0, 6986.0]], "color": "yellow", "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[2.0, 48.0]], "color": "orange", "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}, {"data": [], "color": "#FF6347", "isOverall": false, "label": "Requests in error", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 2.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 174.85163043478263, "minX": 1.7907591E12, "maxY": 190.85128913443847, "series": [{"data": [[1.7907591E12, 174.85163043478263], [1.79075916E12, 190.85128913443847]], "isOverall": false, "label": "登录压测线程组", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.79075916E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 71.0, "minX": 2.0, "maxY": 1191.6666666666667, "series": [{"data": [[2.0, 888.0], [4.0, 416.0], [5.0, 71.0], [6.0, 312.0], [7.0, 73.6], [8.0, 424.8], [9.0, 82.4], [10.0, 365.6666666666667], [11.0, 84.25], [12.0, 266.6], [13.0, 227.16666666666666], [14.0, 372.0], [15.0, 162.46153846153845], [16.0, 93.4], [17.0, 458.4], [18.0, 217.5], [19.0, 265.1666666666667], [20.0, 942.0], [21.0, 950.0], [22.0, 464.33333333333337], [23.0, 293.72222222222223], [24.0, 1070.0], [25.0, 269.0], [26.0, 317.3076923076923], [27.0, 242.45454545454547], [28.0, 1006.0], [29.0, 213.0], [30.0, 325.0], [31.0, 405.0], [32.0, 420.5], [33.0, 205.19047619047618], [35.0, 218.9047619047619], [34.0, 1041.0], [36.0, 443.0], [37.0, 627.0], [38.0, 269.7619047619047], [39.0, 238.47058823529414], [40.0, 955.0], [43.0, 212.75], [42.0, 938.0], [44.0, 453.28571428571433], [45.0, 320.6666666666667], [46.0, 356.5], [47.0, 579.0], [49.0, 323.8125], [48.0, 1019.0], [50.0, 327.3636363636364], [52.0, 397.52173913043475], [53.0, 1018.0], [54.0, 687.0], [55.0, 365.92307692307696], [56.0, 391.9166666666667], [57.0, 669.0], [58.0, 363.76923076923083], [59.0, 444.75], [60.0, 692.5], [61.0, 366.11764705882354], [62.0, 485.1666666666667], [63.0, 704.0], [64.0, 422.42105263157896], [65.0, 337.5], [67.0, 383.6875], [66.0, 937.5], [68.0, 484.40000000000003], [69.0, 542.0], [70.0, 422.090909090909], [72.0, 794.6666666666666], [73.0, 447.90909090909093], [75.0, 1015.0], [74.0, 1002.0], [76.0, 471.7619047619048], [78.0, 610.25], [79.0, 485.5263157894737], [77.0, 1075.0], [80.0, 663.6666666666666], [81.0, 733.5], [82.0, 494.1000000000001], [83.0, 733.0], [84.0, 518.2941176470588], [85.0, 566.375], [86.0, 573.5], [87.0, 561.3333333333334], [88.0, 547.3125000000001], [89.0, 572.1666666666666], [91.0, 522.8181818181818], [90.0, 1092.0], [93.0, 747.0], [94.0, 541.4347826086956], [92.0, 1041.0], [96.0, 769.0], [97.0, 553.625], [98.0, 663.625], [99.0, 573.5], [102.0, 613.0], [103.0, 603.4736842105264], [100.0, 972.0], [104.0, 669.7142857142857], [105.0, 657.1666666666666], [106.0, 606.7058823529412], [107.0, 664.25], [108.0, 792.0], [109.0, 591.3333333333334], [110.0, 704.0], [111.0, 653.6249999999999], [112.0, 678.6363636363636], [113.0, 652.25], [114.0, 739.6666666666666], [115.0, 659.9333333333334], [116.0, 773.1666666666666], [117.0, 655.3478260869566], [119.0, 673.4761904761905], [118.0, 1054.0], [120.0, 818.5], [121.0, 657.75], [122.0, 777.6666666666666], [123.0, 1016.0], [124.0, 632.6666666666666], [125.0, 689.2857142857142], [127.0, 690.3333333333334], [126.0, 1019.0], [128.0, 741.2], [129.0, 607.3846153846154], [130.0, 815.8888888888889], [132.0, 705.0], [133.0, 782.4], [135.0, 772.7272727272726], [131.0, 1103.0], [137.0, 927.5], [138.0, 775.4615384615383], [139.0, 838.5], [140.0, 798.15], [142.0, 762.1428571428572], [143.0, 856.8], [141.0, 1050.0], [136.0, 1090.0], [144.0, 848.6], [145.0, 823.0], [146.0, 895.0], [147.0, 849.1874999999999], [148.0, 875.2857142857143], [149.0, 939.0], [150.0, 870.2500000000001], [151.0, 939.1666666666666], [152.0, 843.409090909091], [153.0, 946.0], [155.0, 862.375], [156.0, 949.6], [157.0, 917.0], [158.0, 896.0476190476192], [159.0, 1134.0], [154.0, 1079.0], [160.0, 956.7058823529412], [162.0, 917.1], [163.0, 802.2], [164.0, 992.2499999999999], [166.0, 923.9333333333333], [167.0, 1020.3333333333334], [165.0, 1165.0], [161.0, 1140.0], [168.0, 930.6666666666666], [169.0, 996.0], [170.0, 985.1428571428571], [172.0, 980.2380952380953], [174.0, 979.9999999999999], [175.0, 1021.7142857142856], [173.0, 1089.0], [171.0, 1092.0], [177.0, 986.1111111111111], [178.0, 1057.0], [179.0, 1005.3333333333334], [180.0, 1027.5], [181.0, 1080.4444444444443], [182.0, 1071.0], [183.0, 1029.2], [176.0, 1111.0], [184.0, 1077.5384615384617], [185.0, 1068.8333333333335], [186.0, 1054.5], [187.0, 1051.25], [189.0, 1049.5625000000002], [190.0, 1094.3333333333333], [191.0, 1033.7333333333331], [188.0, 1142.5], [194.0, 1191.6666666666667], [195.0, 1092.5000000000002], [197.0, 1068.9166666666667], [198.0, 1118.75], [199.0, 1179.888888888889], [196.0, 1159.5], [192.0, 1133.0], [200.0, 1163.6438060444991]], "isOverall": false, "label": "POST /admin/login", "isController": false}, {"data": [[179.36934477379103, 1051.059932397296]], "isOverall": false, "label": "POST /admin/login-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 200.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTimeVsThreads");
        return;
    }
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 8036.4, "minX": 1.7907591E12, "maxY": 61364.0, "series": [{"data": [[1.7907591E12, 61364.0], [1.79075916E12, 24145.4]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.7907591E12, 20424.0], [1.79075916E12, 8036.4]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.79075916E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 1014.5034420289851, "minX": 1.7907591E12, "maxY": 1143.9659300184155, "series": [{"data": [[1.7907591E12, 1014.5034420289851], [1.79075916E12, 1143.9659300184155]], "isOverall": false, "label": "POST /admin/login", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.79075916E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 1014.4518115942046, "minX": 1.7907591E12, "maxY": 1143.9139042357294, "series": [{"data": [[1.7907591E12, 1014.4518115942046], [1.79075916E12, 1143.9139042357294]], "isOverall": false, "label": "POST /admin/login", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.79075916E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyLatenciesOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.7907591E12, "maxY": 0.032971014492753595, "series": [{"data": [[1.7907591E12, 0.032971014492753595], [1.79075916E12, 0.0]], "isOverall": false, "label": "POST /admin/login", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.79075916E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyConnectTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 67.0, "minX": 1.7907591E12, "maxY": 2307.0, "series": [{"data": [[1.7907591E12, 2307.0], [1.79075916E12, 2238.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.7907591E12, 1245.0], [1.79075916E12, 1237.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.7907591E12, 1366.1599999999999], [1.79075916E12, 1359.54]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.7907591E12, 1275.0], [1.79075916E12, 1274.0]], "isOverall": false, "label": "95th percentile", "isController": false}, {"data": [[1.7907591E12, 67.0], [1.79075916E12, 119.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.7907591E12, 1134.0], [1.79075916E12, 1143.0]], "isOverall": false, "label": "Median", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.79075916E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 78.5, "minX": 36.0, "maxY": 1219.5, "series": [{"data": [[36.0, 78.5], [64.0, 971.0], [117.0, 148.0], [144.0, 351.5], [158.0, 874.5], [159.0, 1163.0], [155.0, 1075.5], [164.0, 227.5], [166.0, 662.0], [161.0, 1031.0], [162.0, 1156.5], [160.0, 1219.5], [168.0, 1160.0], [169.0, 1178.0], [173.0, 1149.5], [171.0, 1188.0], [172.0, 1163.5], [175.0, 1139.0], [174.0, 1132.0], [177.0, 1148.0], [183.0, 1183.0], [176.0, 1132.0], [180.0, 1149.0], [178.0, 1148.5], [179.0, 1132.0], [186.0, 1130.5], [184.0, 1113.0], [198.0, 1101.5]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 198.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 78.5, "minX": 36.0, "maxY": 1219.5, "series": [{"data": [[36.0, 78.5], [64.0, 971.0], [117.0, 148.0], [144.0, 351.5], [158.0, 874.5], [159.0, 1163.0], [155.0, 1075.5], [164.0, 227.5], [166.0, 662.0], [161.0, 1031.0], [162.0, 1156.5], [160.0, 1219.5], [168.0, 1160.0], [169.0, 1178.0], [173.0, 1149.5], [171.0, 1188.0], [172.0, 1163.5], [175.0, 1139.0], [174.0, 1132.0], [177.0, 1148.0], [183.0, 1183.0], [176.0, 1132.0], [180.0, 1148.5], [178.0, 1148.5], [179.0, 1132.0], [186.0, 1130.5], [184.0, 1113.0], [198.0, 1101.5]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 198.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median Latency time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 32.86666666666667, "minX": 1.7907591E12, "maxY": 95.33333333333333, "series": [{"data": [[1.7907591E12, 95.33333333333333], [1.79075916E12, 32.86666666666667]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.79075916E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 36.2, "minX": 1.7907591E12, "maxY": 92.0, "series": [{"data": [[1.7907591E12, 92.0], [1.79075916E12, 36.2]], "isOverall": false, "label": "200", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.79075916E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 36.2, "minX": 1.7907591E12, "maxY": 92.0, "series": [{"data": [[1.7907591E12, 92.0], [1.79075916E12, 36.2]], "isOverall": false, "label": "POST /admin/login-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.79075916E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTransactionsPerSecond");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var totalTPSInfos = {
        data: {"result": {"minY": 36.2, "minX": 1.7907591E12, "maxY": 92.0, "series": [{"data": [[1.7907591E12, 92.0], [1.79075916E12, 36.2]], "isOverall": false, "label": "Transaction-success", "isController": false}, {"data": [], "isOverall": false, "label": "Transaction-failure", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.79075916E12, "title": "Total Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTotalTPS"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                },
                colors: ["#9ACD32", "#FF6347"]
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTotalTPS"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTotalTPS"), dataset, options);
        // setup overview
        $.plot($("#overviewTotalTPS"), dataset, prepareOverviewOptions(options));
    }
};

// Total Transactions per second
function refreshTotalTPS(fixTimestamps) {
    var infos = totalTPSInfos;
    // We want to ignore seriesFilter
    prepareSeries(infos.data, false, true);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotTotalTPS"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTotalTPS");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTotalTPS", "#overviewTotalTPS");
        $('#footerTotalTPS .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyCustomGraph") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCustomGraph(true);
            }
            document.location.href="#responseCustomGraph";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyTotalTPS") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTotalTPS(true);
            }
            document.location.href="#totalTPS";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    }else if(id == "choicesResponseCustomGraph"){
        choiceContainer = $("#choicesResponseCustomGraph");
        refreshCustomGraph(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "choicesResponseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesTotalTPS"){
        choiceContainer = $("#choicesTotalTPS");
        refreshTotalTPS(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    if(choiceContainer != null) {
        choiceContainer.find("label").each(function(){
            this.style.color = color;
        });
    }
}

