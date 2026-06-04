"use client";

import { MoreHorizontal, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeAdmin } from "@/lib/actions/admin-actions";

type Admin = {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  profile_picture_url: string | null;
};

function getInitials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminRosterTable({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemovalAdmin, setPendingRemovalAdmin] =
    useState<Admin | null>(null);

  const handleRemoveAdmin = (adminId: string) => {
    setActionError(null);
    setRemovingAdminId(adminId);

    startTransition(async () => {
      try {
        await removeAdmin(adminId);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to remove admin.",
        );
      } finally {
        setRemovingAdminId(null);
      }
    });
  };

  return (
    <>
      {pendingRemovalAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Remove admin"
            className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Remove admin?</h2>
                <p className="text-muted-foreground text-sm">
                  This will make the user a standard student.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPendingRemovalAdmin(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">
                  {pendingRemovalAdmin.full_name ?? "No name provided"}
                </p>
                <p className="text-muted-foreground">
                  {pendingRemovalAdmin.email}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={removingAdminId === pendingRemovalAdmin.user_id}
                  onClick={() => setPendingRemovalAdmin(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={removingAdminId === pendingRemovalAdmin.user_id}
                  onClick={async () => {
                    handleRemoveAdmin(pendingRemovalAdmin.user_id);
                    setPendingRemovalAdmin((current) =>
                      current?.user_id === pendingRemovalAdmin.user_id
                        ? null
                        : current,
                    );
                  }}
                >
                  {removingAdminId === pendingRemovalAdmin.user_id
                    ? "Removing..."
                    : "Remove admin"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Full Name</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4">Phone Number</TableHead>
              <TableHead className="px-4">Role</TableHead>
              <TableHead className="w-14 px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="p-3 text-center text-destructive"
                >
                  {actionError}
                </TableCell>
              </TableRow>
            ) : null}
            {admins.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="p-4 text-center text-muted-foreground"
                >
                  No admins found.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.user_id} className="[&>td]:align-middle">
                  <TableCell className="px-4 align-middle">
                    <div className="flex min-h-9 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium text-muted-foreground">
                        {admin.profile_picture_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={admin.profile_picture_url}
                              alt={admin.full_name ?? "Admin profile"}
                              className="h-full w-full object-cover"
                            />
                          </>
                        ) : (
                          <span>{getInitials(admin.full_name)}</span>
                        )}
                      </div>
                      <span
                        className={
                          admin.full_name
                            ? "font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {admin.full_name ?? "No name provided"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {admin.email}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {admin.phone ?? "No phone number"}
                  </TableCell>
                  <TableCell>
                    {admin.role === "owner" ? "Owner" : "Admin"}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open row actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          View Availability
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            setPendingRemovalAdmin(admin);
                          }}
                        >
                          {isPending && removingAdminId === admin.user_id
                            ? "Removing..."
                            : "Remove admin"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
