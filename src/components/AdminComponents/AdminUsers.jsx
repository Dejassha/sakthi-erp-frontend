import React, { useEffect, useState, useMemo, useCallback } from "react";
import PageHeader from "@/components/ReusableComponents/PageHeader";
import GlobalButton from "@/components/ReusableComponents/Button";
import { message } from "antd";
import {
  useGetUsersQuery,
  useGetRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/store/services/admin.api";
import { useAuth } from "@/context/useAuth";
import {
  UserTable,
  AddUserModal,
  EditUserModal,
} from "./UserComponents/index";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const {
    data: users = [],
    isLoading: loading,
    isError,
    refetch,
  } = useGetUsersQuery(undefined);
  const { data: rolesData } = useGetRolesQuery(undefined);
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const allRoles = rolesData?.roles || [];

  // Stable S.No mapping
  const memoizedUsers = useMemo(() => {
    return users.map((u, idx) => ({
      ...u,
      sno: idx + 1,
    }));
  }, [users]);

  // Modals Visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // React to error in query
  useEffect(() => {
    if (isError) {
      message.error(
        "Failed to load users. Please check your backend connection.",
      );
    }
  }, [isError]);

  // Add new user
  const handleAddUser = async (formData) => {
    try {
      await createUser(formData).unwrap();
      refetch();
      message.success("User Created Successfully");
      setIsModalOpen(false);
    } catch (err) {
      message.error(
        err.data?.message || err.data?.msg || "Error creating user.",
      );
      throw err;
    }
  };

  // Open Edit Modal
  const openEditModal = useCallback((item) => {
    setEditItem(item);
    setEditModalOpen(true);
  }, []);

  // Save updated user
  const handleUpdateUser = async ({ id, values }) => {
    if (!id) return;
    try {
      await updateUser({
        id,
        body: values,
      }).unwrap();
      refetch();
      message.success("User Updated Successfully");
      setEditModalOpen(false);
    } catch (err) {
      message.error(
        err.data?.message || err.data?.msg || "Error updating user",
      );
      throw err;
    }
  };

  // Delete user
  const handleDeleteUser = useCallback(
    async (id) => {
      try {
        await deleteUser(id).unwrap();
        refetch();
        message.success("User Deleted Successfully");
      } catch (err) {
        message.error(err.data?.message || err.data?.msg || "Delete failed.");
      }
    },
    [deleteUser, refetch],
  );

  return (
    <div className="max-w-8xl mx-auto">
      {/* Header Section */}
      <PageHeader
        title="User Management"
        actions={
          <GlobalButton
            color="blue"
            icon="lucide:plus"
            onClick={() => setIsModalOpen(true)}
          >
            Add User
          </GlobalButton>
        }
      />

      {/* Table Section */}
      <UserTable
        users={memoizedUsers}
        loading={loading || deleting}
        onEdit={openEditModal}
        onDelete={handleDeleteUser}
        currentUser={currentUser}
      />

      {/* ADD MODAL */}
      <AddUserModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleAddUser}
        loading={creating}
        allRoles={allRoles}
      />

      {/* EDIT MODAL */}
      <EditUserModal
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onSubmit={handleUpdateUser}
        loading={updating}
        allRoles={allRoles}
        user={editItem}
      />
    </div>
  );
};

export default AdminUsers;
