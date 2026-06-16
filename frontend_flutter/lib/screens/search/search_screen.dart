import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  _SearchScreenState createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  final _apiClient = ApiClient();
  
  bool _isLoading = false;
  List<dynamic> _results = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    // If we passed a query parameter, we could initialize it here.
    // go_router passes params via state, but we don't have direct access here 
    // unless passed in constructor. For now, empty state.
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiClient.get('/paper/search?q=${Uri.encodeComponent(query)}&limit=20');
      if (response != null && response['data'] != null && response['data']['papers'] != null) {
        setState(() {
          _results = response['data']['papers'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _results = [];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to search papers. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Papers'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              onSubmitted: _performSearch,
              decoration: InputDecoration(
                hintText: 'Search for articles, authors, topics...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: () => _performSearch(_searchController.text),
                ),
              ),
            ),
          ),
          if (_isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(child: Center(child: Text(_error!, style: const TextStyle(color: Colors.red))))
          else if (_results.isEmpty && _searchController.text.isNotEmpty)
            const Expanded(child: Center(child: Text('No results found.')))
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _results.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final paper = _results[index];
                  return _buildPaperCard(paper);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPaperCard(dynamic paper) {
    final title = paper['title'] ?? 'Untitled';
    final abstract = paper['abstract'] ?? '';
    final year = paper['year'] ?? '';
    final authorsList = paper['authors'] as List<dynamic>? ?? [];
    final authors = authorsList.take(3).map((a) => a['name']).join(', ');

    return Card(
      child: InkWell(
        onTap: () {
          final id = paper['_id'] ?? paper['id'];
          if (id != null) {
            context.push('/papers/$id');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 8),
              if (authors.isNotEmpty) ...[
                Text(
                  authors + (authorsList.length > 3 ? ' et al.' : ''),
                  style: TextStyle(
                    color: AppTheme.secondaryColor,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(
                'Year: $year',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 8),
              if (abstract.isNotEmpty)
                Text(
                  abstract,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 14,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

