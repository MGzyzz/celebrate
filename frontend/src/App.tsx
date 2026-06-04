import { DesignApp } from "./design/DesignApp";
import { emptyAppData, fetchBootstrapData } from "./api/bootstrap";
import { joinGroupByCode } from "./api/accounts";
import {
  createEvent,
  CreateEventPayload,
  ParticipationStatus,
  updateEvent,
  UpdateEventPayload,
  updateParticipationShare,
  UpdateParticipationSharePayload,
  updateParticipationStatus,
} from "./api/events";
import { approvePriceItem, createCategory, createFundraising, CreateFundraisingPayload, createPriceItem, CreatePriceItemPayload, deleteCategory, finalizeFundraising, rejectPriceItem } from "./api/fundraising";
import { createPlace, CreatePlacePayload, supportPlace } from "./api/places";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function App() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrapData,
    retry: false,
  });
  const createFundraisingMutation = useMutation({
    mutationFn: (payload: CreateFundraisingPayload) => createFundraising(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const createPriceItemMutation = useMutation({
    mutationFn: (payload: CreatePriceItemPayload) => createPriceItem(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const createPlaceMutation = useMutation({
    mutationFn: (payload: CreatePlacePayload) => createPlace(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const supportPlaceMutation = useMutation({
    mutationFn: (placeId: string) => supportPlace(placeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const joinGroupMutation = useMutation({
    mutationFn: (code: string) => joinGroupByCode(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const updateEventMutation = useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const updateParticipationMutation = useMutation({
    mutationFn: (status: ParticipationStatus) => updateParticipationStatus(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const approvePriceItemMutation = useMutation({
    mutationFn: ({ id, itemType }: { id: string; itemType?: string }) =>
      approvePriceItem(id, itemType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const rejectPriceItemMutation = useMutation({
    mutationFn: (id: string) => rejectPriceItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const finalizeMutation = useMutation({
    mutationFn: finalizeFundraising,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const updateParticipationShareMutation = useMutation({
    mutationFn: (payload: UpdateParticipationSharePayload) => updateParticipationShare(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });

  return (
    <DesignApp
      initialData={bootstrapQuery.data ?? emptyAppData}
      dataSource={bootstrapQuery.isSuccess ? "api" : "fallback"}
      isLoading={bootstrapQuery.isLoading}
      isError={bootstrapQuery.isError}
      onRetry={() => bootstrapQuery.refetch()}
      onCreateCollection={(payload) => createFundraisingMutation.mutateAsync(payload)}
      isCreatingCollection={createFundraisingMutation.isPending}
      onCreateItem={(payload) => createPriceItemMutation.mutateAsync(payload)}
      isCreatingItem={createPriceItemMutation.isPending}
      onCreatePlace={(payload) => createPlaceMutation.mutateAsync(payload)}
      isCreatingPlace={createPlaceMutation.isPending}
      onSupportPlace={(placeId) => supportPlaceMutation.mutateAsync(placeId)}
      onJoinGroup={(code) => joinGroupMutation.mutateAsync(code)}
      isJoiningGroup={joinGroupMutation.isPending}
      onCreateEvent={(payload) => createEventMutation.mutateAsync(payload)}
      isCreatingEvent={createEventMutation.isPending}
      onUpdateEvent={(payload) => updateEventMutation.mutateAsync(payload)}
      isUpdatingEvent={updateEventMutation.isPending}
      onUpdateParticipation={(status) => updateParticipationMutation.mutateAsync(status)}
      isUpdatingParticipation={updateParticipationMutation.isPending}
      onApproveItem={(id, itemType) => approvePriceItemMutation.mutateAsync({ id, itemType })}
      onRejectItem={(id) => rejectPriceItemMutation.mutateAsync(id)}
      onFinalize={() => finalizeMutation.mutateAsync()}
      isFinalizing={finalizeMutation.isPending}
      onUpdateParticipationShare={(payload) => updateParticipationShareMutation.mutateAsync(payload)}
      isUpdatingParticipationShare={updateParticipationShareMutation.isPending}
      onCreateCategory={async (name) => { await createCategoryMutation.mutateAsync(name); }}
      isCreatingCategory={createCategoryMutation.isPending}
      onDeleteCategory={async (id) => { await deleteCategoryMutation.mutateAsync(id); }}
    />
  );
}
