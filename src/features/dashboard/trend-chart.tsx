import { useState } from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from "react-native-svg";

import { colors } from "@/theme/colors";
import type { SalesTrendPoint } from "@/types/database";
import { niceMax, compactSom, dayLabel } from "./dashboard-math";

const H = 190;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;

/** Tushum (ustun) + foyda (chiziq) trend grafigi — react-native-svg. */
export function TrendChart({ data }: { data: SalesTrendPoint[] }) {
  const [w, setW] = useState(320);

  const n = data.length;
  const maxRev = niceMax(Math.max(1, ...data.map((d) => d.revenue)));
  const plotW = Math.max(1, w - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;

  const xCenter = (i: number) => PAD_L + (plotW * (i + 0.5)) / Math.max(1, n);
  const yOf = (v: number) => PAD_T + plotH * (1 - v / maxRev);
  const barW = Math.max(3, (plotW / Math.max(1, n)) * 0.55);

  const gridFracs = [0, 0.5, 1];
  const every = n <= 8 ? 1 : Math.ceil(n / 6);
  const profitPoints = data.map((d, i) => `${xCenter(i)},${yOf(d.profit)}`).join(" ");

  const allZero = data.every((d) => d.revenue === 0 && d.profit === 0);

  if (n === 0 || allZero) {
    return (
      <View style={{ height: H, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Bu davrda sotuv yo'q</Text>
      </View>
    );
  }

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width="100%" height={H}>
        {/* Gorizontal to'r + Y yorliqlari */}
        {gridFracs.map((f) => {
          const v = maxRev * f;
          const y = yOf(v);
          return (
            <Line
              key={`g${f}`}
              x1={PAD_L}
              y1={y}
              x2={w - PAD_R}
              y2={y}
              stroke={colors.line}
              strokeWidth={1}
            />
          );
        })}
        {gridFracs.map((f) => (
          <SvgText
            key={`yl${f}`}
            x={0}
            y={yOf(maxRev * f) + 3}
            fontSize={9}
            fill={colors.tabInactive}
          >
            {compactSom(maxRev * f)}
          </SvgText>
        ))}

        {/* Tushum ustunlari */}
        {data.map((d, i) => {
          const y = yOf(d.revenue);
          return (
            <Rect
              key={`b${i}`}
              x={xCenter(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(0, baseY - y)}
              rx={3}
              fill={colors.primary}
              opacity={0.9}
            />
          );
        })}

        {/* Foyda chizig'i + nuqtalar */}
        <Polyline
          points={profitPoints}
          fill="none"
          stroke={colors.success}
          strokeWidth={2}
        />
        {data.map((d, i) => (
          <Circle key={`p${i}`} cx={xCenter(i)} cy={yOf(d.profit)} r={2.5} fill={colors.success} />
        ))}

        {/* X yorliqlari (kun) */}
        {data.map((d, i) =>
          i % every === 0 || i === n - 1 ? (
            <SvgText
              key={`xl${i}`}
              x={xCenter(i)}
              y={H - 6}
              fontSize={9}
              fill={colors.tabInactive}
              textAnchor="middle"
            >
              {dayLabel(d.day)}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}
