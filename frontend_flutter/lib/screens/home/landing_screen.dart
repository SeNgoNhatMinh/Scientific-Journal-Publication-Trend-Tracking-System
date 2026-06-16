import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({Key? key}) : super(key: key);

  @override
  _LandingScreenState createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _searchController = TextEditingController();
  final _apiClient = ApiClient();
  
  bool _isLoadingTrends = true;
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
      final response = await _apiClient.get('/trends/keyword-categories?limit=5');
      if (response != null && response['data'] != null && response['data']['keywords'] != null) {
        setState(() {
          _trendingTopics = response['data']['keywords'];
          _isLoadingTrends = false;
        });
      } else {
        setState(() => _isLoadingTrends = false);
      }
    } catch (e) {
      setState(() => _isLoadingTrends = false);
    }
  }

  void _handleSearch(String keyword) {
    if (keyword.trim().isNotEmpty) {
      context.push('/search?keyword=${Uri.encodeComponent(keyword.trim())}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),
                // Hero Section
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.secondaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.secondaryColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.auto_awesome, size: 16, color: AppTheme.secondaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'AI-powered scientific journal analytics',
                          style: TextStyle(color: AppTheme.secondaryColor, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'Discover\nResearch Trends',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                      height: 1.1,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'Track emerging topics and analyze academic publication velocity.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: 40),

                // Search Bar
                Container(
                  decoration: BoxDecoration(
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: _handleSearch,
                    decoration: InputDecoration(
                      hintText: 'e.g., federated learning...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.arrow_forward),
                        onPressed: () => _handleSearch(_searchController.text),
                        color: AppTheme.secondaryColor,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                // Quick suggestions
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    'LLM', 'Computer Vision', 'Reinforcement Learning'
                  ].map((topic) {
                    return ActionChip(
                      label: Text(topic, style: const TextStyle(fontSize: 12)),
                      onPressed: () => _handleSearch(topic),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(color: Colors.grey.shade300),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 48),

                // Trending Topics
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.trending_up, color: AppTheme.secondaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'Trending Now',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => context.go('/trends'),
                      child: const Text('View all'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                if (_isLoadingTrends)
                  const Center(child: CircularProgressIndicator())
                else if (_trendingTopics.isEmpty)
                  const Center(child: Text('No trending topics available right now.'))
                else
                  SizedBox(
                    height: 160,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _trendingTopics.length,
                      itemBuilder: (context, index) {
                        final topic = _trendingTopics[index];
                        return _buildTopicCard(topic, index);
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopicCard(dynamic topic, int index) {
    final colors = [
      Colors.purple, Colors.blue, Colors.pink, Colors.green, Colors.orange
    ];
    final color = colors[index % colors.length];

    final title = topic['name'] ?? 'Topic';
    final category = topic['category'] ?? 'Research';
    final count = topic['paperCount'] ?? 0;

    return Container(
      width: 240,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Text(
              category.toString().toUpperCase(),
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Text(
            '$count papers',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

