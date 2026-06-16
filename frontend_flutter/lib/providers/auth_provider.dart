import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api/api_client.dart';
import '../core/constants.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  User? _user;
  String? _token;
  bool _isLoading = true; // Initially loading while checking token
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _token != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(AppConstants.tokenKey);
      final userJsonString = prefs.getString(AppConstants.userKey);

      if (_token != null && userJsonString != null) {
        _user = User.fromJson(jsonDecode(userJsonString));
        // Verify token validity with backend
        try {
          final response = await _apiClient.get('/auth/me');
          if (response['data'] != null) {
            _user = User.fromJson(response['data']['user'] ?? response['data']);
            await prefs.setString(AppConstants.userKey, jsonEncode(_user!.toJson()));
          }
        } catch (e) {
          // Token might be expired
          await logout();
        }
      } else {
        _token = null;
        _user = null;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _error = null;

    try {
      final response = await _apiClient.post('/auth/login', {
        'email': email,
        'password': password,
      });

      if (response != null && response['token'] != null) {
        await _saveAuthData(response);
        return true;
      }
      return false;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = 'Failed to connect to server';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register(String name, String email, String password) async {
    _setLoading(true);
    _error = null;

    try {
      final response = await _apiClient.post('/auth/register', {
        'name': name,
        'email': email,
        'password': password,
      });

      if (response != null && response['token'] != null) {
        await _saveAuthData(response);
        return true;
      }
      return false;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = 'Failed to connect to server';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> _saveAuthData(Map<String, dynamic> response) async {
    final prefs = await SharedPreferences.getInstance();
    
    _token = response['token'];
    _user = User.fromJson(response['data']['user'] ?? response['data']);
    
    await prefs.setString(AppConstants.tokenKey, _token!);
    await prefs.setString(AppConstants.userKey, jsonEncode(_user!.toJson()));
    
    notifyListeners();
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      // Optional: notify backend about logout
      try {
        await _apiClient.get('/auth/logout');
      } catch (e) {
        // ignore errors on logout
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AppConstants.tokenKey);
      await prefs.remove(AppConstants.userKey);
      
      _token = null;
      _user = null;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
