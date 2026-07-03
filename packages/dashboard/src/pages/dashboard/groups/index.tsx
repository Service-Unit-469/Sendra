import dayjs from "dayjs";
import { Edit2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import { GroupForm } from "../../../components/GroupForm/Form";
import { StyledInput } from "../../../components/Input/Input/StyledInput";
import Modal from "../../../components/Overlay/Modal/Modal";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Table from "../../../components/Table/Table";
import Empty from "../../../components/Utility/Empty/Empty";
import { useAllContacts } from "../../../lib/hooks/contacts";
import { useAllGroups } from "../../../lib/hooks/groups";
import { useModalState } from "../../../lib/hooks/useModalState";

export default function Index() {
  const navigate = useNavigate();
  const { data: groups, mutate: mutateGroups } = useAllGroups();
  const { data: contacts } = useAllContacts();
  const createGroupModal = useModalState();

  const [query, setQuery] = useState<string>("");

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase()));
  }, [groups, query]);

  const hasContacts = (contacts?.length ?? 0) > 0;

  const startCreateGroupFlow = () => {
    if (contacts && contacts.length === 0) {
      toast.info("Create a contact before creating a group.");
      navigate("/contacts");
      return;
    }

    createGroupModal.open();
  };

  let emptyTitle = "No groups";
  let emptyDescription = "Create a group to organize your contacts.";
  let emptyCtaLabel = "Create group";
  let emptyCtaTo: string | undefined;
  let emptyCtaClick: (() => void) | undefined = startCreateGroupFlow;

  if (query) {
    emptyDescription = "No groups match your filter.";
  } else if (!hasContacts) {
    emptyTitle = "No contacts yet";
    emptyDescription = "Create a contact first, then organize contacts into groups.";
    emptyCtaLabel = "Create contact";
    emptyCtaTo = "/contacts";
    emptyCtaClick = undefined;
  }

  return (
    <>
      <Modal
        isOpen={createGroupModal.isOpen}
        onToggle={createGroupModal.toggle}
        onAction={() => {
          createGroupModal.close();
          void mutateGroups();
        }}
        type="info"
        title="Create new group"
        hideActionButtons={true}
      >
        <GroupForm
          onSuccess={() => {
            createGroupModal.close();
            void mutateGroups();
          }}
        />
      </Modal>
      <Card
        title="Groups"
        description="View and manage your contact groups"
        actions={
          <div className="grid w-full gap-3 md:w-fit md:grid-cols-2">
            <StyledInput onChange={(e) => setQuery(e.target.value)} autoComplete="off" type="search" placeholder="Filter groups" value={query} className="" />
            <BlackButton onClick={startCreateGroupFlow}>
              <Plus strokeWidth={1.5} size={18} />
              New
            </BlackButton>
          </div>
        }
      >
        {!filteredGroups && <Skeleton type={"table"} />}
        {filteredGroups && filteredGroups.length === 0 && <Empty title={emptyTitle} description={emptyDescription} ctaLabel={emptyCtaLabel} ctaTo={emptyCtaTo} onCtaClick={emptyCtaClick} />}
        {filteredGroups && filteredGroups.length > 0 && (
          <Table
            values={filteredGroups
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((g) => {
                return {
                  Name: g.name,
                  Updated: dayjs().to(g.updatedAt).toString(),
                  Members: g.contacts.length,
                  Edit: (
                    <Link to={`/groups/${g.id}`} className="transition hover:text-neutral-800">
                      <Edit2 size={18} />
                    </Link>
                  ),
                };
              })}
          />
        )}
      </Card>
    </>
  );
}
