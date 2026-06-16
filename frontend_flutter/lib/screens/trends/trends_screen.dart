import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class TrendsScreen extends StatefulWidget {
  const TrendsScreen({Key? key}) : super(key: key);

  @override
  _TrendsScreenState createState() => _TrendsScreenState();
}

class _TrendsScreenState extends State<TrendsScreen> {
  final _searchController = TextEditingController();
  final _apiClient = ApiClient();

  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _trendData;
  List<dynamic> _trendingTopics = [];

  @override
  void initState() {
    super.initState();
    _fetchTrendingTopics();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchTrendingTopics() async {
    try {
      final response = await _apiClient.get('/trends/trending');
      if (response != null && response['data'] != null && response['data']['topics'] != null) {
        setState(() {
          _trendingTopics = response['data']['topics'];
        });
      }
    } catch (e) {
      // ignore silently
    }
  }

  Future<void> _analyzeTrend(String keyword) async {
    if (keyword.trim().isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiClient.get('/trends/keyword?keyword=${Uri.encodeComponent(keyword)}');
      if (response != null && response['data'] != null) {
        setState(() {
          _trendData = response['data'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'No data found for this keyword.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to analyze trend. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Global Research Trends'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Analyze publication velocity and track emerging research topics in real time.',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),
            
            // Search Input
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: _analyzeTrend,
                    decoration: InputDecoration(
                      hintText: 'e.g., Transformer Models, CRISPR...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _analyzeTrend(_searchController.text),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  ),
                  child: _isLoading 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Analyze'),
                ),
              ],
            ),
            
            const SizedBox(height: 24),

            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),

            if (_trendData != null && !_isLoading) ...[
              _buildTrendChart(_trendData!),
            ] else if (!_isLoading && _error == null) ...[
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Icon(Icons.show_chart, size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      const Text(
                        'Search for a keyword to view its trend chart.',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 32),
            
            // Hot Topics
            Row(
              children: [
                Icon(Icons.trending_up, color: Colors.orange.shade400, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Hot Topics Now',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_trendingTopics.isEmpty)
              const Text('No trending topics available.', style: TextStyle(color: AppTheme.textSecondary))
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _trendingTopics.map((topic) {
                  final name = topic['name'] ?? topic.toString();
                  return ActionChip(
                    label: Text(name),
                    onPressed: () {
                      _searchController.text = name;
                      _analyzeTrend(name);
                    },
                    backgroundColor: Colors.orange.shade50,
                    side: BorderSide(color: Colors.orange.shade200),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendChart(Map<String, dynamic> data) {
    final keyword = data['keyword'] ?? 'Unknown';
    final growthRate = data['averageGrowthRate'] ?? '0';
    final trends = data['trends'] as List<dynamic>? ?? [];

    if (trends.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Text('No trend data available for this keyword.'),
      );
    }

    // Process data for fl_chart
    final spots = <FlSpot>[];
    double maxY = 0;
    double minY = double.infinity;
    
    for (int i = 0; i < trends.length; i++) {
      final t = trends[i];
      final count = (t['count'] as num).toDouble();
      if (count > maxY) maxY = count;
      if (count < minY) minY = count;
      spots.add(FlSpot(i.toDouble(), count));
    }

    // Add some padding to maxY
    maxY = maxY + (maxY * 0.1);
    if (maxY == 0) maxY = 10;

    return Card(
      margin: const EdgeInsets.only(top: 16),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  keyword,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$growthRate% Growth',
                    style: const TextStyle(
                      color: AppTheme.secondaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxY > 0 ? maxY / 4 : 1,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: Colors.grey.shade200,
                        strokeWidth: 1,
                        dashArray: [5, 5],
                      );
                    },
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 30,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= 0 && value.toInt() < trends.length) {
                            final year = trends[value.toInt()]['year'].toString();
                            return Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Text(year, style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: maxY > 0 ? maxY / 4 : 1,
                        reservedSize: 42,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            value.toInt().toString(),
                            style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                            textAlign: TextAlign.right,
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  minX: 0,
                  maxX: (trends.length - 1).toDouble(),
                  minY: 0,
                  maxY: maxY,
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppTheme.secondaryColor,
                      barWidth: 3,
                      isStrokeCapRound: true,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppTheme.secondaryColor.withOpacity(0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

