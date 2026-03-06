import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import {
  DEFAULT_PERMISSION_MATRIX,
  getPermissionMatrix,
  MODULE_LABELS,
  ModuleKey,
  PermissionMatrix,
  Role,
  setPermissionMatrix,
} from "@/lib/auth";

const ROLES: Role[] = ["super-admin", "admin", "manager", "employee"];

export default function RolesPermissions() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(() => getPermissionMatrix());

  useEffect(() => {
    setPermissionMatrix(matrix);
  }, [matrix]);

  const moduleKeys = useMemo(() => Object.keys(MODULE_LABELS) as ModuleKey[], []);

  const setCell = (role: Role, moduleKey: ModuleKey, next: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: next,
      },
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground mt-1">Control which roles can access each module.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setMatrix(DEFAULT_PERMISSION_MATRIX)}
            >
              Reset Defaults
            </Button>
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Module Access Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="capitalize">{r}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleKeys.map((moduleKey) => (
                    <TableRow key={moduleKey} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{MODULE_LABELS[moduleKey]}</TableCell>
                      {ROLES.map((role) => {
                        const enabled = Boolean(matrix?.[role]?.[moduleKey]);
                        return (
                          <TableCell key={`${moduleKey}-${role}`}>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setCell(role, moduleKey, e.target.checked)}
                              />
                              <Badge variant="secondary" className={enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                                {enabled ? "Allowed" : "Blocked"}
                              </Badge>
                            </label>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
