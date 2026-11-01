"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, validatePaymentAmount, derivePaymentStatus } from "@repairshop/shared";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Badge } from "@/components/common/Badge";
import { CreditCard, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

const RUPEE = '\u20B9'; // Indian Rupee sign — Unicode U+20B9

interface PaymentRecordingBoxProps {
  invoiceId?: string;
  grandTotal: number;
  amountPaid: number;
  paymentMethod?: string;
  status?: string;
  onPaymentRecorded?: (updatedInvoice: any) => void;
  disabled?: boolean;
}

export function PaymentRecordingBox({
  invoiceId,
  grandTotal,
  amountPaid,
  paymentMethod = "Cash",
  status,
  onPaymentRecorded,
  disabled = false,
}: PaymentRecordingBoxProps) {
  const { showToast } = useToast();
  const [amountInput, setAmountInput] = useState<string>(String(amountPaid ?? 0));
  const [method, setMethod] = useState<string>(paymentMethod || "Cash");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  // Sync state with props
  useEffect(() => {
    setAmountInput(String(amountPaid ?? 0));
  }, [amountPaid]);

  useEffect(() => {
    setMethod(paymentMethod || "Cash");
  }, [paymentMethod]);

  const numAmount = parseFloat(amountInput) || 0;
  const balanceDue = Math.max(0, grandTotal - numAmount);
  const changeDue = Math.max(0, numAmount - grandTotal);
  const derivedStatus = derivePaymentStatus(Math.min(numAmount, grandTotal), grandTotal);

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const parsed = parseFloat(val);
    if (val.trim() === "") {
      setValidationError("Please enter a payment amount");
      return;
    }
    if (isNaN(parsed) || parsed < 0) {
      setValidationError("Invalid payment amount");
    } else {
      setValidationError(null);
    }
  };

  const handleSetFullAmount = () => {
    setAmountInput(String(grandTotal));
    setValidationError(null);
  };

  const handleSelectCashAmount = (amount: number) => {
    setAmountInput(String(amount));
    setMethod("Cash");
    setValidationError(null);
  };

  const handleRecordPayment = async () => {
    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed < 0) {
      setValidationError("Payment amount cannot be negative or empty");
      return;
    }

    const paymentToRecord = Math.min(parsed, grandTotal);
    const validation = validatePaymentAmount(paymentToRecord, grandTotal);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid payment amount");
      showToast(validation.error || "Invalid payment amount", "error");
      return;
    }

    if (!invoiceId) {
      showToast("Please save the bill/invoice first before recording payments", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("record_installment_payment", {
        p_invoice_id: invoiceId,
        p_cash_amount: paymentToRecord,
        p_payment_method: method,
      });

      if (error) throw new Error(error.message);

      const msg = changeDue > 0
        ? `Payment recorded! Change due: ${formatCurrency(changeDue)}`
        : paymentToRecord >= grandTotal
          ? "Payment recorded: Invoice is now fully Paid"
          : `Partial payment of ${formatCurrency(paymentToRecord)} recorded`;

      showToast(msg, "success");
      setIsEditingPayment(false);

      if (onPaymentRecorded) {
        onPaymentRecorded(data);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const isFullPaid = (derivedStatus === "paid" || status === "paid" || (amountPaid >= grandTotal && grandTotal > 0));
  const isInvalid = Boolean(validationError) || numAmount < 0;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-admin-bg-subtle border border-admin-border text-admin-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-admin-accent" />
          <h4 className="text-sm font-semibold">Payment Details</h4>
        </div>
        <Badge
          variant={
            isFullPaid
              ? "success"
              : derivedStatus === "partial"
                ? "warning"
                : "danger"
          }
          className="uppercase tracking-wider text-[10px] font-bold"
        >
          {isFullPaid ? "PAID" : derivedStatus}
        </Badge>
      </div>

      {/* Bill Amount Display (Read-Only) */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-admin-bg-surface border border-admin-border">
        <span className="text-xs font-medium text-admin-text-secondary uppercase tracking-wider">
          Total Bill Amount
        </span>
        <span className="text-lg font-bold text-admin-text-primary">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* Dedicated Settled Banner if Fully Paid and not in edit mode */}
      {isFullPaid && !isEditingPayment ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Invoice Fully Settled</p>
                <p className="text-[11px] text-admin-text-secondary truncate">
                  Paid {formatCurrency(amountPaid || grandTotal)} via {paymentMethod || method}
                </p>
              </div>
            </div>
            <Badge variant="success" className="uppercase text-[10px] font-bold shrink-0">PAID</Badge>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingPayment(true)}
            disabled={disabled || loading}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-admin-text-muted hover:text-admin-accent-text hover:underline transition-colors w-full py-1"
          >
            <Edit3 size={12} />
            <span>Adjust or Record Payment</span>
          </button>
        </div>
      ) : (
        <>
          {/* Editable Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-admin-text-secondary">
                Amount Paid ({RUPEE})
              </label>
              {numAmount < grandTotal && (
                <button
                  type="button"
                  onClick={handleSetFullAmount}
                  disabled={disabled || loading}
                  className="text-xs font-semibold text-admin-accent-text hover:underline focus:outline-none"
                >
                  Pay Full ({formatCurrency(grandTotal)})
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={disabled || loading}
                placeholder="0.00"
                className={`w-full font-semibold text-base ${isInvalid ? "border-admin-urgent-fg focus:ring-admin-urgent-fg" : ""
                  }`}
              />
            </div>
            {validationError && (
              <div className="flex items-center gap-1.5 text-xs text-admin-urgent-fg pt-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Fast Cash Shortcuts: strictly 1 row with horizontal scroll if needed */}
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider">
              Fast Cash
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar whitespace-nowrap">
              <button
                type="button"
                onClick={handleSetFullAmount}
                disabled={disabled || loading}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors ${numAmount === grandTotal
                    ? "bg-admin-accent-dim text-admin-accent-text border-admin-accent/30"
                    : "bg-admin-bg-surface text-admin-text-secondary border-admin-border hover:text-admin-text-primary"
                  }`}
              >
                Exact
              </button>
              {[500, 1000, 2000].map((denomination) => (
                <button
                  key={denomination}
                  type="button"
                  onClick={() => handleSelectCashAmount(denomination)}
                  disabled={disabled || loading}
                  className={`shrink-0 px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors ${numAmount === denomination
                      ? "bg-admin-accent-dim text-admin-accent-text border-admin-accent/30"
                      : "bg-admin-bg-surface text-admin-text-secondary border-admin-border hover:text-admin-text-primary"
                    }`}
                >
                  {RUPEE}{denomination}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-admin-text-secondary">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={disabled || loading}
              className="w-full h-10 px-3 rounded-lg bg-admin-bg-surface border border-admin-border text-sm text-admin-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Balance & Change Due Summary */}
          <div className="space-y-1.5 bg-admin-bg-surface p-2.5 rounded-lg border border-admin-border text-xs">
            <div className="flex justify-between items-center text-admin-text-secondary">
              <span>Balance Remaining:</span>
              <span
                className={`font-bold ${balanceDue > 0 ? "text-admin-urgent-fg" : "text-admin-success-fg"
                  }`}
              >
                {formatCurrency(balanceDue)}
              </span>
            </div>
            {changeDue > 0 && (
              <div className="flex justify-between items-center pt-1.5 border-t border-admin-border">
                <span className="font-semibold text-admin-text-primary">Change to Return:</span>
                <span className="font-extrabold text-admin-accent-text text-sm">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            type="button"
            onClick={handleRecordPayment}
            isLoading={loading}
            disabled={disabled || loading || isInvalid || !invoiceId}
            variant="primary"
            leftIcon={<CheckCircle2 size={16} />}
            className="w-full justify-center h-10 font-semibold"
          >
            {isFullPaid ? "Update Payment" : "Record Payment"}
          </Button>

          {isFullPaid && isEditingPayment && (
            <button
              type="button"
              onClick={() => setIsEditingPayment(false)}
              className="text-[11px] text-admin-text-muted hover:underline block text-center w-full"
            >
              Done Adjusting
            </button>
          )}
        </>
      )}

      {!invoiceId && (
        <p className="text-[11px] text-center text-admin-text-muted">
          Save billing statement first to enable payment recording.
        </p>
      )}
    </div>
  );
}
