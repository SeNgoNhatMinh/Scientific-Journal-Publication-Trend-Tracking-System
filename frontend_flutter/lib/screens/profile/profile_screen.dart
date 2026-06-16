import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (user != null) ...[
              Text('Name: ${user.name}', style: const TextStyle(fontSize: 20)),
              Text('Email: ${user.email}'),
              const SizedBox(height: 20),
            ],
            ElevatedButton(
              onPressed: () async {
                await context.read<AuthProvider>().logout();
                if (context.mounted) {
                  context.go('/login');
                }
              },
              child: const Text('Logout'),
            ),
          ],
        ),
      ),
    );
  }
}
