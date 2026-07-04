import React from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { GitBranch, Activity, BookOpen } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, Circle, G, Text as SvgText } from 'react-native-svg';
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

export { AreaChart };

export default function WorkspaceMap({
  theme,
  graphData,
}: {
  theme: any;
  graphData: { nodes: any[]; links: any[] };
}) {
  const { nodes, links } = graphData;

  // Separate nodes by type
  const rootNode = nodes.find(n => n.type === 'root');
  const categories = nodes.filter(n => n.type === 'category');
  const keywords = nodes.filter(n => n.type === 'keyword');

  // Horizontal Tree Layout logic
  const rowHeight = 42;
  const rootX = 30;
  const catX = 150;
  const kwX = 280;

  const catPoints = new Map();
  const kwPoints = new Map();

  let currentY = 40;

  categories.forEach(cat => {
    // Find keywords linked to this category
    const linkedKwIds = links.filter(l => l.source === cat.id).map(l => l.target);
    const catKeywords = keywords
      .filter(k => linkedKwIds.includes(k.id))
      .sort((a, b) => b.val - a.val);
      
    // Calculate vertical space needed for this category
    const catHeight = Math.max(60, catKeywords.length * rowHeight);
    
    // Position Category Node in the vertical middle of its block
    const catY = currentY + catHeight / 2;
    catPoints.set(cat.id, { ...cat, x: catX, y: catY });
    
    // Position Keyword Nodes evenly spaced within the block
    catKeywords.forEach((kw, idx) => {
      const kwY = currentY + (idx + 0.5) * (catHeight / Math.max(1, catKeywords.length));
      kwPoints.set(kw.id, { ...kw, x: kwX, y: kwY });
    });
    
    currentY += catHeight;
  });

  const totalHeight = Math.max(300, currentY + 40);
  const rootY = totalHeight / 2;
  const svgWidth = 480; // Allow horizontal scrolling if names are long

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Research Map (Tree View)</Text>
            <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
              Visual hierarchy of workspace entities
            </Text>
          </View>
          <GitBranch size={20} color={theme.primary} style={{ opacity: 0.8 }} />
        </View>

        {nodes.length <= 1 ? (
          <View style={styles.emptyContainer}>
            <GitBranch size={36} color={theme.icon} style={{ opacity: 0.2, marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
              Add papers to populate this workspace research map.
            </Text>
          </View>
        ) : (
          <View style={styles.mapWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <ScrollView showsVerticalScrollIndicator={true}>
                <View style={[styles.graphContainer, { height: totalHeight, width: svgWidth }]}>
                  <Svg height={totalHeight} width={svgWidth}>
                    
                    {/* Draw Links: Category -> Keywords */}
                    {Array.from(kwPoints.values()).map((kw, idx) => {
                      // Find which category this kw belongs to
                      const link = links.find(l => l.target === kw.id);
                      if (!link) return null;
                      const catPoint = catPoints.get(link.source);
                      if (!catPoint) return null;
                      
                      // Bezier curve for smoother look
                      const pathData = `M ${catPoint.x} ${catPoint.y} C ${catPoint.x + 50} ${catPoint.y}, ${kw.x - 50} ${kw.y}, ${kw.x} ${kw.y}`;
                      
                      return (
                        <Path key={`link-kw-${idx}`} d={pathData} stroke={theme.border} strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
                      );
                    })}

                    {/* Draw Links: Root -> Category */}
                    {rootNode && Array.from(catPoints.values()).map((cat, idx) => {
                      const pathData = `M ${rootX} ${rootY} C ${rootX + 50} ${rootY}, ${cat.x - 50} ${cat.y}, ${cat.x} ${cat.y}`;
                      return (
                        <Path key={`link-cat-${idx}`} d={pathData} stroke={theme.border} strokeWidth="2" strokeOpacity="0.6" fill="none" />
                      );
                    })}
                    
                    {/* Draw Keyword Nodes */}
                    {Array.from(kwPoints.values()).map((p, idx) => (
                      <G key={`kw-${idx}`}>
                        <Circle cx={p.x} cy={p.y} r={6} fill={p.color || theme.primary} opacity={0.7} />
                        <SvgText x={p.x + 12} y={p.y + 4} fill={theme.mutedForeground} fontSize="11" textAnchor="start">
                          {p.label || p.id} {p.val > 1 ? `(${p.val})` : ''}
                        </SvgText>
                      </G>
                    ))}

                    {/* Draw Category Nodes */}
                    {Array.from(catPoints.values()).map((p, idx) => (
                      <G key={`cat-${idx}`}>
                        <Circle cx={p.x} cy={p.y} r={10} fill={p.color || '#8b5cf6'} opacity={0.9} />
                        <SvgText x={p.x - 14} y={p.y + 4} fill={theme.text} fontSize="12" fontWeight="bold" textAnchor="end">
                          {p.label}
                        </SvgText>
                      </G>
                    ))}

                    {/* Draw Root Node */}
                    {rootNode && (
                      <G>
                        <Circle cx={rootX} cy={rootY} r={16} fill={theme.primary} />
                        <BookOpen x={rootX - 8} y={rootY - 8} size={16} color="#fff" />
                        <SvgText x={rootX + 22} y={rootY + 5} fill={theme.text} fontSize="13" fontWeight="bold" textAnchor="start">
                          {rootNode.label.length > 10 ? rootNode.label.slice(0,10) + '...' : rootNode.label}
                        </SvgText>
                      </G>
                    )}

                  </Svg>
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 20, gap: 16, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 4 },
  emptyContainer: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  mapWrapper: { borderWidth: 1, borderColor: 'rgba(150,150,150,0.1)', borderRadius: 12, marginTop: 10, overflow: 'hidden' },
  graphContainer: { padding: 10 },
  
  // Chart styles
  emptyGraph: { height: 160, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyGraphText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  chartLabelText: { fontSize: 9 },
});
