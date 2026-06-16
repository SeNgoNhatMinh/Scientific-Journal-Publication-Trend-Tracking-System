class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? profilePicture;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.profilePicture,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'user',
      profilePicture: json['profilePicture'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'profilePicture': profilePicture,
    };
  }
}
