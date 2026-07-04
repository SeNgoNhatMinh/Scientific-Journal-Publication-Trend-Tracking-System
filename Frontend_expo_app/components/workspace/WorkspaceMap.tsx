import React from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { GitBranch, Activity, BookOpen } from 'lucide-react-native';
import Svg, { Line, Circle, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, Path, G } from 'react-native-svg';
import { CategoryColors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Custom SVG Area Chart for publication trends
function AreaChart({ data, theme }: { data: { year: number; count: number }[]; theme: any }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <Activity size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No historical trend data available.
        </Text>
      </View>
    );
  }

  const chartHeight = 130;
  const chartWidth = width - 72;
  const paddingX = 16;
  const paddingY = 16;

  const counts = data.map((d) => d.count);
  const years = data.map((d) => d.year);
  const maxCount = Math.max(...counts, 5);
  const minCount = Math.min(...counts, 0);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);

  const countRange = maxCount - minCount;
  const yearRange = maxYear - minYear || 1;

  const points = data.map((d) => {
    const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.count - minCount) / countRange) * (chartHeight - paddingY * 2);
    return { x, y };
  });

  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, idx) => {
      if (idx > 0) linePath += ` L ${p.x} ${p.y}`;
    });
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <View style={styles.chartContainer}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <SvgLinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingY + ratio * (chartHeight - paddingY * 2);
          return (
            <Path
              key={idx}
              d={`M ${paddingX} ${y} L ${chartWidth - paddingX} ${y}`}
              stroke={theme.border}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {areaPath ? <Path d={areaPath} fill="url(#gradient)" /> : null}
        {linePath ? <Path d={linePath} fill="none" stroke={theme.primary} strokeWidth="2" /> : null}
        {points.map((p, idx) => (
          <Circle key={idx} cx={p.x} cy={p.y} r={3.5} fill={theme.primary} />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, marginTop: 4, paddingHorizontal: 8 }}>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{minYear}</Text>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{maxYear}</Text>
      </View>
    </View>
  );
}

// Custom SVG Node Network Graph for Workspace keyword co-occurrence
function NodeGraph({ nodes, centerKeyword, theme }: { nodes: any[]; centerKeyword: string; theme: any }) {
  const chartSize = 260;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  if (!nodes || nodes.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <GitBranch size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No keyword relationships found. Add papers or run corpus collection to build graph.
        </Text>
      </View>
    );
  }

  const visibleNodes = nodes.slice(0, 8);
  const radius = 80;

  const points = visibleNodes.map((node, i) => {
    const angle = (i * 2 * Math.PI) / visibleNodes.length;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { ...node, x, y };
  });

  return (
    <View style={styles.graphContainer}>
      <Svg height={chartSize} width={chartSize}>
        {/* Draw connection lines */}
        {points.map((p, idx) => (
          <Line
            key={`line-${idx}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={theme.border}
            strokeWidth="1.5"
          />
        ))}

        {/* Draw satellite nodes */}
        {points.map((p, idx) => {
          const color = CategoryColors[p.category || 'general'] || '#8b5cf6';
          return (
            <G key={`node-${idx}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill={color}
                opacity={0.8}
              />
              <SvgText
                x={p.x}
                y={p.y + 20}
                fill={theme.text}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.label || p.name || p.id}
              </SvgText>
            </G>
          );
        })}

        {/* Draw center node */}
        <Circle cx={cx} cy={cy} r={18} fill={theme.primary} />
        <SvgText
          x={cx}
          y={cy + 3}
          fill="#ffffff"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
        >
          {centerKeyword.length > 8 ? `${centerKeyword.slice(0, 7)}.` : centerKeyword}
        </SvgText>
      </Svg>
    </View>
  );
}

export { AreaChart, NodeGraph };

export default function WorkspaceMap({
  theme,
  graphNodes,
  chartSize,
  points,
  cx,
  cy
}: {
  theme: any;
  graphNodes: any[];
  chartSize: number;
  points: any[];
  cx: number;
  cy: number;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Workspace Entity Map</Text>
        <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
          Visualizes relationships extracted from workspace papers.
        </Text>

        {graphNodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <GitBranch size={36} color={theme.icon} style={{ opacity: 0.2, marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
              Add papers to populate this workspace research map.
            </Text>
          </View>
        ) : (
          <View style={styles.graphContainer}>
            <Svg height={chartSize} width={chartSize}>
              {points.map((p, idx) => (
                <Line key={idx} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.border} strokeWidth="1.5" />
              ))}
              {points.map((p, idx) => {
                const color = CategoryColors[p.category] || CategoryColors.general;
                return (
                  <React.Fragment key={idx}>
                    <Circle cx={p.x} cy={p.y} r={14} fill={color} opacity={0.8} />
                    <SvgText x={p.x} y={p.y + 20} fill={theme.text} fontSize="8" fontWeight="bold" textAnchor="middle">
                      {p.label || p.id}
                    </SvgText>
                  </React.Fragment>
                );
              })}
              <Circle cx={cx} cy={cy} r={18} fill={theme.primary} />
              <BookOpen size={14} color="#fff" style={styles.centerLogo} />
            </Svg>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  emptyContainer: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  graphContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  centerLogo: { position: 'absolute', alignSelf: 'center' },
  
  // Chart styles
  emptyGraph: { height: 160, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyGraphText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  chartLabelText: { fontSize: 9 },
});
