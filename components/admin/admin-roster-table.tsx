"use client";

import { MoreHorizontal, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

function getRoleLabel(role: string) {
  return role === "owner" ? "Owner" : "Admin";
}

function getRoleFormat(role: string) {
  return role === "owner"
    ? "rounded-full bg-red-900/20 px-2 py-1 text-xs font-medium text-red-800"
    : "rounded-full bg-blue-700/20 px-2 py-1 text-xs font-medium text-blue-600";
}

export function AdminRosterTable({ admins, isOwner }: { admins: Admin[]; isOwner: boolean; }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemovalAdmin, setPendingRemovalAdmin] = useState<Admin | null>(null);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);

  const isRemovingSelected = removingAdminId === pendingRemovalAdmin?.user_id;

  const handleRemoveAdmin = (adminId: string) => {
    setActionError(null);
    setRemovingAdminId(adminId);

    startTransition(async () => {
      try {
        await removeAdmin(adminId);
        setPendingRemovalAdmin(null);
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
      <ConfirmDialog
        open={!!pendingRemovalAdmin}
        title="Demote Admin?"
        description="This will change the selected admin back into a standard student."
        confirmText={isRemovingSelected ? "Demoting..." : "Demote Admin"}
        destructive
        disabled={isRemovingSelected}
        onCancel={() => setPendingRemovalAdmin(null)}
        onConfirm={() => {
          if (!pendingRemovalAdmin) return;
          handleRemoveAdmin(pendingRemovalAdmin.user_id);
        }}
      >
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">
            {pendingRemovalAdmin?.full_name ?? "No name provided"}
          </p>
          <p className="text-muted-foreground">
            {pendingRemovalAdmin?.email}
          </p>
        </div>
      </ConfirmDialog>

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
                    <span className={getRoleFormat(admin.role)}>
                      {getRoleLabel(admin.role)}
                    </span>
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

                        {isOwner && (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isPending}
                            onSelect={(event) => {
                              event.preventDefault();
                              setPendingRemovalAdmin(admin);
                            }}
                          >
                            {isPending && removingAdminId === admin.user_id
                              ? "Demoting..."
                              : "Demote Admin"}
                          </DropdownMenuItem>
                        )}
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
