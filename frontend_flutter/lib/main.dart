import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/main_layout.dart';
import 'screens/home/landing_screen.dart';
import 'screens/search/search_screen.dart';
import 'screens/trends/trends_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/paper/paper_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorHomeKey = GlobalKey<NavigatorState>(debugLabel: 'home');
final _shellNavigatorSearchKey = GlobalKey<NavigatorState>(debugLabel: 'search');
final _shellNavigatorTrendsKey = GlobalKey<NavigatorState>(debugLabel: 'trends');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'profile');

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: Builder(
        builder: (context) {
          final authProvider = context.watch<AuthProvider>();
          
          final goRouter = GoRouter(
            navigatorKey: _rootNavigatorKey,
            initialLocation: '/',
            redirect: (context, state) {
              if (authProvider.isLoading) return null;

              final isAuth = authProvider.isAuthenticated;
              final isLoginRoute = state.matchedLocation == '/login';
              final isRegisterRoute = state.matchedLocation == '/register';
              
              if (!isAuth && state.matchedLocation == '/profile') {
                return '/login';
              }
              
              if (isAuth && (isLoginRoute || isRegisterRoute)) {
                return '/';
              }
              
              return null;
            },
            routes: [
              GoRoute(
                path: '/login',
                builder: (context, state) => const LoginScreen(),
              ),
              GoRoute(
                path: '/register',
                builder: (context, state) => const RegisterScreen(),
              ),
              GoRoute(
                path: '/papers/:id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return PaperScreen(id: id);
                },
              ),
              StatefulShellRoute.indexedStack(
                builder: (context, state, navigationShell) {
                  return MainLayout(navigationShell: navigationShell);
                },
                branches: [
                  StatefulShellBranch(
                    navigatorKey: _shellNavigatorHomeKey,
                    routes: [
                      GoRoute(
                        path: '/',
                        builder: (context, state) => const LandingScreen(),
                      ),
                    ],
                  ),
                  StatefulShellBranch(
                    navigatorKey: _shellNavigatorSearchKey,
                    routes: [
                      GoRoute(
                        path: '/search',
                        builder: (context, state) => const SearchScreen(),
                      ),
                    ],
                  ),
                  StatefulShellBranch(
                    navigatorKey: _shellNavigatorTrendsKey,
                    routes: [
                      GoRoute(
                        path: '/trends',
                        builder: (context, state) => const TrendsScreen(),
                      ),
                    ],
                  ),
                  StatefulShellBranch(
                    navigatorKey: _shellNavigatorProfileKey,
                    routes: [
                      GoRoute(
                        path: '/profile',
                        builder: (context, state) => const ProfileScreen(),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          );

          if (authProvider.isLoading) {
            return const MaterialApp(
              home: Scaffold(
                body: Center(child: CircularProgressIndicator()),
              ),
            );
          }

          return MaterialApp.router(
            title: 'Scientific Journal Trends',
            theme: AppTheme.lightTheme,
            routerConfig: goRouter,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
