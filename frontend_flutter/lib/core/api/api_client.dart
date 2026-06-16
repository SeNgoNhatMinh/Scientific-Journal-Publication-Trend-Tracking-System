import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';

class ApiClient {
  final http.Client _client = http.Client();

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> get(String endpoint) async {
    final headers = await _getHeaders();
    final response = await _client.get(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final response = await _client.post(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final response = await _client.put(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> delete(String endpoint) async {
    final headers = await _getHeaders();
    final response = await _client.delete(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isNotEmpty) {
        return jsonDecode(response.body);
      }
      return null;
    } else {
      String message = 'Something went wrong';
      try {
        final body = jsonDecode(response.body);
        message = body['message'] ?? message;
      } catch (e) {
        // ignore
      }
      throw ApiException(message, response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
