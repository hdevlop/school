CREATE INDEX "fee_installments_fee_idx" ON "fee_installments" USING btree ("fee_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_fee_idx" ON "payment_allocations" USING btree ("fee_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_installment_idx" ON "payment_allocations" USING btree ("installment_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_payment_idx" ON "payment_allocations" USING btree ("payment_id");