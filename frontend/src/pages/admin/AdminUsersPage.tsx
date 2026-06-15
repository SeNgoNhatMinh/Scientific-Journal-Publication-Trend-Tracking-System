import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Trash2, UserPlus } from "lucide-react"

const mockUsers = [
  { id: "1", name: "Alice Researcher", email: "alice@university.edu", role: "researcher", status: "active", date: "2026-01-12" },
  { id: "2", name: "Bob Student", email: "bob@student.edu", role: "student", status: "active", date: "2026-03-22" },
  { id: "3", name: "Dr. Charlie", email: "charlie@lab.org", role: "lecturer", status: "blocked", date: "2026-04-05" },
  { id: "4", name: "Admin Setup", email: "admin@system.local", role: "admin", status: "active", date: "2026-01-01" },
  { id: "5", name: "Eve Eve", email: "eve@company.com", role: "researcher", status: "active", date: "2026-05-15" },
]

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage user roles and system access.</p>
        </div>
        <Button className="w-full sm:w-auto"><UserPlus className="h-4 w-4 mr-2" /> Add User</Button>
      </div>

      <div className="rounded-md border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'outline' : 'destructive'} className="capitalize border-0 bg-background/50 backdrop-blur-sm">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10">
                    <Lock className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
