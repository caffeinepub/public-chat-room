import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob } from "../backend";
import type { Message } from "../backend.d";
import { useActor } from "./useActor";

export function useGetMessages() {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessages();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      senderName,
      content,
      imageFile,
    }: {
      senderName: string;
      content: string;
      imageFile?: File;
    }) => {
      if (!actor) throw new Error("No actor");
      let blob: ExternalBlob | null = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        blob = ExternalBlob.fromBytes(bytes);
      }
      return actor.postMessage(senderName, content, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
