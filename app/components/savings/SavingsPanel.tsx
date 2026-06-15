import styles from '../../WishlistPage.module.css';
import type { SavingsState } from '../../hooks/useSavingsState';
import {
  formatCompactCurrency,
  formatDateOnly,
  formatDateTime,
  formatPriceInput,
  formatTimeOnly,
} from '../../lib/helpers';

interface SavingsPanelProps {
  boyName: string;
  girlName: string;
  savings: SavingsState;
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className={styles.savingsProgressTrack} aria-label={`Progres ${percentage}%`}>
      <span className={styles.savingsProgressFill} style={{ width: `${percentage}%` }} />
    </div>
  );
}

export default function SavingsPanel({ boyName, girlName, savings }: SavingsPanelProps) {
  if (savings.pageMode === 'add') {
    return (
      <section className={styles.contentShellWide}>
        <div className={styles.savingsFormPage}>
          <header className={styles.savingsPageHeader}>
            <button type="button" className={styles.backButton} onClick={savings.handleOpenGoalList}>
              ← Kembali
            </button>
            <div>
              <p className={styles.savingsEyebrow}>Target baru</p>
              <h2>Buat tabungan bersama</h2>
              <p>Tentukan nama dan target. Setoran dapat ditambahkan oleh {boyName} maupun {girlName}.</p>
            </div>
          </header>

          <form className={styles.savingsFormCard} onSubmit={savings.handleAddGoal}>
            <div className={styles.formField}>
              <label htmlFor="savings-goal-name">Nama tabungan</label>
              <input
                id="savings-goal-name"
                className={styles.input}
                value={savings.newGoalName}
                onChange={(event) => savings.setNewGoalName(event.target.value)}
                placeholder="Contoh: Pernikahan, rumah, honeymoon"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="savings-goal-target">Target nominal</label>
              <div className={styles.savingsCurrencyInput}>
                <span>Rp</span>
                <input
                  id="savings-goal-target"
                  className={styles.input}
                  inputMode="numeric"
                  value={savings.newGoalTarget}
                  onChange={(event) => savings.setNewGoalTarget(formatPriceInput(event.target.value))}
                  placeholder="100.000.000"
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="savings-goal-description">
                Catatan <span>Opsional</span>
              </label>
              <textarea
                id="savings-goal-description"
                className={styles.savingsTextarea}
                value={savings.newGoalDescription}
                onChange={(event) => savings.setNewGoalDescription(event.target.value)}
                placeholder="Contoh: Target tercapai sebelum Desember 2027"
                maxLength={240}
                rows={4}
              />
            </div>

            <div className={styles.savingsFormActions}>
              <button type="submit" className={styles.giftPrimaryAction}>
                Buat Tabungan
              </button>
              <button type="button" className={styles.secondaryButton} onClick={savings.handleOpenGoalList}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (savings.pageMode === 'detail' && savings.selectedSummary) {
    const summary = savings.selectedSummary;

    return (
      <section className={styles.contentShellWide}>
        <div className={styles.savingsDetailPage}>
          <header className={styles.savingsDetailHeader}>
            <div>
              <button type="button" className={styles.backButton} onClick={savings.handleOpenGoalList}>
                ← Semua tabungan
              </button>
              <p className={styles.savingsEyebrow}>Detail tabungan</p>
              <h2>{summary.goal.name}</h2>
              {summary.goal.description ? <p>{summary.goal.description}</p> : null}
            </div>
            <button type="button" className={styles.savingsDangerButton} onClick={savings.handleDeleteGoal}>
              Hapus Tabungan
            </button>
          </header>

          <div className={styles.savingsDetailOverview}>
            <div className={styles.savingsMainStat}>
              <span>Terkumpul</span>
              <strong>{formatCompactCurrency(summary.totalSaved)}</strong>
              <small>dari target {formatCompactCurrency(summary.goal.target_amount)}</small>
              <ProgressBar percentage={summary.progressPercentage} />
              <b>{summary.progressPercentage}% tercapai</b>
            </div>

            <div className={styles.savingsMiniStats}>
              <div>
                <span>Sisa target</span>
                <strong>{formatCompactCurrency(summary.remaining)}</strong>
              </div>
              <div>
                <span>Total setoran</span>
                <strong>{summary.entryCount} kali</strong>
              </div>
              <div>
                <span>{boyName}</span>
                <strong>{formatCompactCurrency(summary.boyTotal)}</strong>
              </div>
              <div>
                <span>{girlName}</span>
                <strong>{formatCompactCurrency(summary.girlTotal)}</strong>
              </div>
            </div>
          </div>

          <form className={styles.savingsDepositForm} onSubmit={savings.handleAddEntry}>
            <div className={styles.savingsDepositHeading}>
              <div>
                <p className={styles.savingsEyebrow}>Tambah setoran</p>
                <h3>Siapa yang menabung?</h3>
              </div>
              <span>Saldo berubah otomatis setelah disimpan</span>
            </div>

            <div className={styles.savingsContributorPicker} role="radiogroup" aria-label="Pilih penyetor">
              <button
                type="button"
                role="radio"
                aria-checked={savings.newEntryContributor === 'boy'}
                className={`${styles.savingsContributorButton} ${
                  savings.newEntryContributor === 'boy' ? styles.savingsContributorButtonActive : ''
                }`}
                onClick={() => savings.setNewEntryContributor('boy')}
              >
                <span>{boyName.slice(0, 1).toUpperCase()}</span>
                <strong>{boyName}</strong>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={savings.newEntryContributor === 'girl'}
                className={`${styles.savingsContributorButton} ${
                  savings.newEntryContributor === 'girl' ? styles.savingsContributorButtonActive : ''
                }`}
                onClick={() => savings.setNewEntryContributor('girl')}
              >
                <span>{girlName.slice(0, 1).toUpperCase()}</span>
                <strong>{girlName}</strong>
              </button>
            </div>

            <div className={styles.savingsDepositGrid}>
              <div className={styles.formField}>
                <label htmlFor="savings-entry-amount">Nominal setoran</label>
                <div className={styles.savingsCurrencyInput}>
                  <span>Rp</span>
                  <input
                    id="savings-entry-amount"
                    className={styles.input}
                    inputMode="numeric"
                    value={savings.newEntryAmount}
                    onChange={(event) => savings.setNewEntryAmount(formatPriceInput(event.target.value))}
                    placeholder="500.000"
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="savings-entry-note">
                  Catatan <span>Opsional</span>
                </label>
                <input
                  id="savings-entry-note"
                  className={styles.input}
                  value={savings.newEntryNote}
                  onChange={(event) => savings.setNewEntryNote(event.target.value)}
                  placeholder="Contoh: Gaji bulan Juni"
                  maxLength={160}
                />
              </div>

              <button type="submit" className={styles.giftPrimaryAction}>
                Simpan Setoran
              </button>
            </div>
          </form>

          <div className={styles.savingsHistoryCard}>
            <div className={styles.savingsHistoryHeader}>
              <div>
                <p className={styles.savingsEyebrow}>Riwayat tabungan</p>
                <h3>Semua setoran</h3>
              </div>
              <strong>{savings.selectedEntries.length} transaksi</strong>
            </div>

            {savings.selectedEntries.length === 0 ? (
              <div className={styles.savingsEmptyState}>
                <span>Rp</span>
                <h4>Belum ada setoran</h4>
                <p>Setoran pertama akan langsung muncul di tabel ini lengkap dengan tanggal dan waktunya.</p>
              </div>
            ) : (
              <div className={styles.savingsTableWrap}>
                <div className={styles.savingsTableHeader} aria-hidden="true">
                  <span>Tanggal</span>
                  <span>Waktu</span>
                  <span>Penabung</span>
                  <span>Catatan</span>
                  <span>Nominal</span>
                  <span />
                </div>

                <div className={styles.savingsTableBody}>
                  {savings.selectedEntries.map((entry) => {
                    const contributorName = entry.contributor === 'boy' ? boyName : girlName;

                    return (
                      <div className={styles.savingsTableRow} key={entry.id}>
                        <span data-label="Tanggal">{formatDateOnly(entry.created_at)}</span>
                        <span data-label="Waktu">{formatTimeOnly(entry.created_at)}</span>
                        <span data-label="Penabung" className={styles.savingsPersonCell}>
                          <b>{contributorName.slice(0, 1).toUpperCase()}</b>
                          {contributorName}
                        </span>
                        <span data-label="Catatan" className={styles.savingsNoteCell}>
                          {entry.note || '—'}
                        </span>
                        <strong data-label="Nominal">+{formatCompactCurrency(entry.amount)}</strong>
                        <button
                          type="button"
                          aria-label={`Hapus setoran ${formatDateTime(entry.created_at)}`}
                          className={styles.savingsDeleteEntryButton}
                          disabled={savings.deletingEntryIDs.has(entry.id)}
                          onClick={() => savings.handleDeleteEntry(entry)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.contentShellWide}>
      <div className={styles.savingsBoard}>
        <header className={styles.savingsBoardHeader}>
          <div>
            <p className={styles.savingsEyebrow}>Keuangan bersama</p>
            <h2>Tabungan Kita</h2>
            <p>Pantau target, kontribusi, dan seluruh riwayat tabungan dalam satu tempat.</p>
          </div>
          <button type="button" className={styles.giftPrimaryAction} onClick={savings.handleOpenAddGoal}>
            + Tabungan Baru
          </button>
        </header>

        <div className={styles.savingsOverviewGrid}>
          <div>
            <span>Total terkumpul</span>
            <strong>{formatCompactCurrency(savings.totalSaved)}</strong>
          </div>
          <div>
            <span>Total target</span>
            <strong>{formatCompactCurrency(savings.totalTarget)}</strong>
          </div>
          <div>
            <span>Masih dibutuhkan</span>
            <strong>{formatCompactCurrency(savings.totalRemaining)}</strong>
          </div>
          <div>
            <span>Target tercapai</span>
            <strong>
              {savings.achievedGoalCount}/{savings.goalSummaries.length}
            </strong>
          </div>
        </div>

        <div className={styles.savingsOverallProgress}>
          <div>
            <span>Progres seluruh tabungan</span>
            <strong>{savings.overallProgressPercentage}%</strong>
          </div>
          <ProgressBar percentage={savings.overallProgressPercentage} />
        </div>
      </div>

      {savings.isLoading ? (
        <div className={styles.savingsGoalsGrid}>
          <div className={styles.savingsSkeleton} />
          <div className={styles.savingsSkeleton} />
        </div>
      ) : savings.goalSummaries.length === 0 ? (
        <div className={styles.savingsEmptyState}>
          <span>Rp</span>
          <h3>Belum ada target tabungan</h3>
          <p>Buat tabungan seperti pernikahan, rumah, kendaraan, honeymoon, atau kebutuhan bersama lainnya.</p>
          <button type="button" className={styles.giftPrimaryAction} onClick={savings.handleOpenAddGoal}>
            Buat Tabungan Pertama
          </button>
        </div>
      ) : (
        <div className={styles.savingsGoalsGrid}>
          {savings.goalSummaries.map((summary) => (
            <button
              type="button"
              className={styles.savingsGoalCard}
              key={summary.goal.id}
              onClick={() => savings.handleOpenGoalDetail(summary.goal.id)}
            >
              <div className={styles.savingsGoalCardTop}>
                <div>
                  <span>{summary.totalSaved >= summary.goal.target_amount ? 'Target tercapai' : 'Target aktif'}</span>
                  <h3>{summary.goal.name}</h3>
                </div>
                <strong>{summary.progressPercentage}%</strong>
              </div>

              {summary.goal.description ? <p>{summary.goal.description}</p> : null}

              <div className={styles.savingsGoalAmount}>
                <strong>{formatCompactCurrency(summary.totalSaved)}</strong>
                <span>dari {formatCompactCurrency(summary.goal.target_amount)}</span>
              </div>

              <ProgressBar percentage={summary.progressPercentage} />

              <div className={styles.savingsGoalMeta}>
                <span>
                  <b>{boyName}</b> {formatCompactCurrency(summary.boyTotal)}
                </span>
                <span>
                  <b>{girlName}</b> {formatCompactCurrency(summary.girlTotal)}
                </span>
              </div>

              <footer>
                <span>{summary.entryCount} setoran</span>
                <span>{summary.latestEntryAt ? `Terakhir ${formatDateOnly(summary.latestEntryAt)}` : 'Belum ada setoran'}</span>
                <b>Lihat detail →</b>
              </footer>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
