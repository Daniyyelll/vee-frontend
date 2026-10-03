import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { messageOf } from "../api/client";
import { storeApi } from "../api/store";
import type { Review } from "../api/store";
import { useSession } from "../auth/Session";

export default function ReviewsPanel({
  productId,
  onSignIn,
}: {
  productId: string;
  onSignIn: () => void;
}) {
  const { token, user } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    storeApi
      .reviews(productId, offset, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setReviews(items);
          setHasMore(items.length === 20);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, offset, reload]);
  useEffect(() => {
    setEditing(null);
    setConfirmDelete(null);
    setActionError("");
    setSuccess("");
  }, [user?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      onSignIn();
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const comment = String(data.get("comment") ?? "").trim();
    if (!comment) {
      setActionError("Write a few words about your experience.");
      return;
    }
    setBusy(true);
    setActionError("");
    setSuccess("");
    try {
      const rating = Number(data.get("rating"));
      if (editing)
        await storeApi.updateReview(token, editing.id, rating, comment);
      else await storeApi.createReview(token, productId, rating, comment);
      setEditing(null);
      setOffset(0);
      setReload((value) => value + 1);
      setSuccess(
        editing
          ? "Your review has been updated."
          : "Thank you. Your review has been posted.",
      );
      form.reset();
    } catch (cause) {
      setActionError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function remove(review: Review) {
    if (!token) return;
    setBusy(true);
    setActionError("");
    setSuccess("");
    try {
      await storeApi.deleteReview(token, review.id);
      setConfirmDelete(null);
      setEditing(null);
      setReload((value) => value + 1);
      setSuccess("Your review has been removed.");
    } catch (cause) {
      setActionError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  const hasOwnReview = reviews.some((review) => review.userId === user?.id);
  return (
    <section className="reviews-panel" aria-labelledby="reviews-title">
      <h3 id="reviews-title">From the collection.</h3>
      <p className="reviews-intro">
        Customer reviews. A delivered purchase is required to write a review.
      </p>
      {loading ? (
        <p role="status">Loading reviews…</p>
      ) : error ? (
        <div className="request-error" role="alert">
          <p>{error}</p>
          <button
            className="text-link"
            onClick={() => setReload((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <article key={review.id} className="review">
                  <div className="review-heading">
                    <strong>{review.username}</strong>
                    <span aria-label={`${review.rating} out of 5`}>
                      {review.rating}/5
                    </span>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <time dateTime={review.createdAt}>
                    {Number.isNaN(Date.parse(review.createdAt))
                      ? ""
                      : new Date(review.createdAt).toLocaleDateString("en", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                  </time>
                  {user?.id === review.userId && (
                    <div className="review-actions">
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => {
                          setEditing(review);
                          setActionError("");
                          setSuccess("");
                        }}
                      >
                        Edit your review
                      </button>
                      {confirmDelete === review.id ? (
                        <>
                          <span>Remove this review?</span>
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={() => remove(review)}
                          >
                            Yes, remove
                          </button>
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={() => setConfirmDelete(null)}
                          >
                            Keep review
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() => setConfirmDelete(review.id)}
                        >
                          Remove review
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="reviews-empty">No reviews on this page yet.</p>
          )}
          {(offset > 0 || hasMore) && (
            <nav className="review-pagination" aria-label="Review pages">
              <button
                className="text-link"
                disabled={offset === 0 || loading || busy}
                onClick={() => setOffset((value) => Math.max(0, value - 20))}
              >
                Previous
              </button>
              <span>Page {Math.floor(offset / 20) + 1}</span>
              <button
                className="text-link"
                disabled={!hasMore || loading || busy}
                onClick={() => setOffset((value) => value + 20)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {success && (
        <p className="form-message" role="status">
          {success}
        </p>
      )}
      {!user ? (
        <button className="text-link" onClick={onSignIn}>
          Sign in to write a review
        </button>
      ) : (
        (!hasOwnReview || editing) && (
          <form
            className="review-form"
            key={editing?.id ?? "new"}
            onSubmit={submit}
            aria-busy={busy}
          >
            <h4>{editing ? "Edit your review" : "Share your experience"}</h4>
            <fieldset disabled={busy}>
              <label>
                Rating
                <select name="rating" defaultValue={editing?.rating ?? 5}>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} out of 5
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your review
                <textarea
                  name="comment"
                  required
                  maxLength={5000}
                  rows={4}
                  defaultValue={editing?.comment ?? ""}
                />
              </label>
              <div className="review-actions">
                <button className="solid-link" type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save review" : "Post review"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Cancel editing
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        )
      )}
    </section>
  );
}
