import Array "mo:core/Array";
import Time "mo:core/Time";
import List "mo:core/List";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  type Message = {
    senderName : Text;
    content : Text;
    image : ?Storage.ExternalBlob;
    timestamp : Time.Time;
  };

  let messages = List.empty<Message>();

  public shared ({ caller }) func postMessage(senderName : Text, content : Text, image : ?Storage.ExternalBlob) : async () {
    let newMessage : Message = {
      senderName;
      content;
      image;
      timestamp = Time.now();
    };

    messages.add(newMessage);
  };

  public query ({ caller }) func getMessages() : async [Message] {
    messages.toArray();
  };
};
