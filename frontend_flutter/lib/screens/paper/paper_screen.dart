import 'package:flutter/material.dart';

import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class PaperScreen extends StatefulWidget {
  final String id;
  const PaperScreen({Key? key, required this.id}) : super(key: key);

  @override
  _PaperScreenState createState() => _PaperScreenState();
}

class _PaperScreenState extends State<PaperScreen> {
  final _apiClient = ApiClient();
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _paper;

  @override
  void initState() {
    super.initState();
    _fetchPaperDetails();
  }

  Future<void> _fetchPaperDetails() async {
    try {
      final response = await _apiClient.get('/paper/${widget.id}');
      if (response != null && response['data'] != null) {
        setState(() {
          _paper = response['data']['paper'] ?? response['data'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Paper not found.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load paper details.';
        _isLoading = false;
      });
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not launch $url')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Paper Details'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null || _paper == null) {
      return Center(
        child: Text(_error ?? 'Unknown error', style: const TextStyle(color: Colors.red)),
      );
    }

    final title = _paper!['title'] ?? 'Untitled';
    final abstract = _paper!['abstract'] ?? 'No abstract available.';
    final year = _paper!['year']?.toString() ?? 'Unknown Year';
    final authorsList = _paper!['authors'] as List<dynamic>? ?? [];
    final url = _paper!['url'] ?? _paper!['pdfUrl'];
    final venue = _paper!['venue'] ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Badges
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.secondaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  year,
                  style: const TextStyle(
                    color: AppTheme.secondaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (venue.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    venue,
                    style: const TextStyle(
                      color: Colors.purple,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Authors
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: authorsList.map((author) {
              return Chip(
                label: Text(author['name'] ?? ''),
                backgroundColor: Colors.grey.shade100,
                side: BorderSide.none,
              );
            }).toList(),
          ),
          
          const SizedBox(height: 32),
          
          const Text(
            'Abstract',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            abstract,
            style: const TextStyle(
              fontSize: 16,
              height: 1.6,
              color: AppTheme.textSecondary,
            ),
          ),
          
          const SizedBox(height: 32),

          if (url != null && url.toString().isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openUrl(url.toString()),
                icon: const Icon(Icons.open_in_new),
                label: const Text('Read Full Paper'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
