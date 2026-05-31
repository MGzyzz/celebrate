import { DesignApp } from "./design/DesignApp";
import { emptyAppData, fetchBootstrapData } from "./api/bootstrap";
import { joinGroupByCode } from "./api/accounts";
import { createFundraising, CreateFundraisingPayload, createPriceItem, CreatePriceItemPayload } from "./api/fundraising";
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

  return (
    <DesignApp
      initialData={bootstrapQuery.data ?? emptyAppData}
      dataSource={bootstrapQuery.isSuccess ? "api" : "fallback"}
      isLoading={bootstrapQuery.isLoading}
      onCreateCollection={(payload) => createFundraisingMutation.mutateAsync(payload)}
      isCreatingCollection={createFundraisingMutation.isPending}
      onCreateItem={(payload) => createPriceItemMutation.mutateAsync(payload)}
      isCreatingItem={createPriceItemMutation.isPending}
      onCreatePlace={(payload) => createPlaceMutation.mutateAsync(payload)}
      isCreatingPlace={createPlaceMutation.isPending}
      onSupportPlace={(placeId) => supportPlaceMutation.mutateAsync(placeId)}
      onJoinGroup={(code) => joinGroupMutation.mutateAsync(code)}
      isJoiningGroup={joinGroupMutation.isPending}
    />
  );
}
