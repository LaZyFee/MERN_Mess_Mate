"use client";

/**
 * T14.6 — Refundable deposit assets (landlord deposit, kitchen equipment,
 * advances). Cursor list with load-more; treasurer+ can record a refund.
 */
import { useCallback, useEffect, useState } from "react";
import { LuBox, LuBanknote, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { assetsApi } from "@/lib/api/expenses";
import { formatPoisha, parseTaka } from "@/lib/utils/format";

const KIND_LABELS = {
  landlord_deposit: "Landlord deposit",
  kitchen_equipment: "Kitchen equipment",
  advance: "Advance",
  other_asset: "Other asset",
};

export default function AssetsPanel({ groupId, canManage = false }) {
  const { showToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [amount, setAmount] = useState("");
  const [shareId, setShareId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetsApi.list(groupId);
      setAssets(data?.assets || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load assets", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await assetsApi.list(groupId, moreCursor);
      const next = data?.assets || [];
      setAssets((current) => {
        const seen = new Set(current.map((a) => a._id));
        return [...current, ...next.filter((a) => !seen.has(a._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load more assets", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const submitRefund = async () => {
    const poisha = parseTaka(amount);
    if (!refunding || poisha <= 0) {
      showToast({ status: "warning", title: "Enter a positive refund amount" });
      return;
    }
    if (!shareId) {
      showToast({ status: "warning", title: "Pick the funding share to refund" });
      return;
    }
    setSaving(true);
    try {
      await assetsApi.refund(groupId, refunding._id, { membershipId: shareId, amount: poisha });
      showToast({ status: "success", title: "Refund recorded" });
      setRefunding(null);
      setAmount("");
      setShareId("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not record refund", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuBox size={15} className="text-(--p)" /> Deposit assets
          </span>
          <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        </div>
      }
    >
      {loading && assets.length === 0 ? (
        <Skeleton variant="rect" height={64} />
      ) : assets.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">No deposit assets recorded. Landlord deposits and shared equipment appear here.</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const remaining = Math.max(0, (asset.currentValuation || asset.initialAmount || 0));
            return (
              <div key={asset._id} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="asset" status={asset.status} />
                  <span className="text-xs font-semibold text-(--ts)">{KIND_LABELS[asset.kind] || asset.kind}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-(--tp)">{asset.name || "Asset"}</p>
                <p className="text-xs text-(--tm)">
                  Held: {formatPoisha(remaining)}
                  {" · "}
                  {asset.refunds?.length || 0} refund(s)
                </p>
                {canManage && asset.status !== "fully_refunded" && asset.status !== "written_off" && (
                  <Button size="sm" variant="outline" leftIcon={<LuBanknote size={13} />} className="mt-2" onClick={() => { setRefunding(asset); setAmount(""); setShareId(""); }}>
                    Record refund
                  </Button>
                )}
              </div>
            );
          })}
          {moreCursor && (
            <Button variant="outline" size="md" isFullWidth isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
              Load more assets
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(refunding)}
        onClose={() => setRefunding(null)}
        header="Record refund"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefunding(null)} isDisabled={saving}>Cancel</Button>
            <Button onClick={submitRefund} isLoading={saving} isDisabled={saving}>Record</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-(--tm)">
            Refund against <strong>{refunding?.name || "this asset"}</strong>. Amount is in ৳ (taka).
          </p>
          <Select
            size="lg"
            label="Funding share"
            isRequired
            options={[
              { value: "", label: "Select a member" },
              ...(refunding?.fundingShares || [])
                .filter((share) => (share.amount - (share.refundedAmount || 0)) > 0)
                .map((share) => ({
                  value: String(share.membershipId),
                  label: `${share.membershipId} · ${formatPoisha(share.amount - (share.refundedAmount || 0))} left`,
                })),
            ]}
            value={shareId}
            onChange={(e) => setShareId(e.target.value)}
          />
          <Input size="lg" label="Refund amount (৳)" isRequired inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}
