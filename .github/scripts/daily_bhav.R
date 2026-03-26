if (!requireNamespace("nser", quietly = TRUE)) install.packages("nser", repos = "https://cran.r-project.org")
if (!requireNamespace("httr", quietly = TRUE)) install.packages("httr", repos = "https://cran.r-project.org")
if (!requireNamespace("jsonlite", quietly = TRUE)) install.packages("jsonlite", repos = "https://cran.r-project.org")

library(nser)
library(httr)
library(jsonlite)

SUPABASE_URL <- "https://axobtyzujcbckkbsakpb.supabase.co"
SUPABASE_KEY <- Sys.getenv("SUPABASE_KEY")
TARGET_SYMBOLS <- c("NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX")

auth_headers <- function() {
  add_headers(
    "apikey"        = SUPABASE_KEY,
    "Authorization" = paste("Bearer", SUPABASE_KEY),
    "Content-Type"  = "application/json",
    "Prefer"        = "resolution=ignore-duplicates"
  )
}

insert_batch <- function(rows) {
  json_body <- toJSON(rows, auto_unbox = TRUE, na = "null")
  res <- POST(
    paste0(SUPABASE_URL, "/rest/v1/bhav_options"),
    auth_headers(),
    body = json_body,
    encode = "raw"
  )
  return(status_code(res))
}

parse_date_safe <- function(x) {
  x <- trimws(as.character(x))
  for (fmt in c("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%b-%y")) {
    result <- tryCatch(format(as.Date(x, format=fmt), "%Y-%m-%d"), error=function(e) NA)
    if (!is.na(result)) return(result)
  }
  return(NA)
}

safe_num <- function(x) {
  v <- suppressWarnings(as.numeric(gsub(",", "", as.character(x))))
  ifelse(is.na(v) | v <= 0, NA, v)
}

safe_int <- function(x) {
  v <- suppressWarnings(as.integer(gsub(",", "", as.character(x))))
  ifelse(is.na(v), 0L, v)
}

process_date <- function(d) {
  date_str <- format(d, "%d%m%Y")

  if (weekdays(d) %in% c("Saturday", "Sunday")) {
    cat(sprintf("%s -- weekend, skipping\n", d))
    return(invisible(NULL))
  }

  check <- GET(
    paste0(SUPABASE_URL, "/rest/v1/bhav_options?date=eq.", as.character(d), "&limit=1&select=date"),
    auth_headers()
  )
  existing <- fromJSON(content(check, "text", encoding="UTF-8"))
  if (length(existing) > 0 && nrow(as.data.frame(existing)) > 0) {
    cat(sprintf("%s -- already in DB, skipping\n", d))
    return(invisible(NULL))
  }

  tryCatch({
    df <- tryCatch({
      if (d >= as.Date("2024-07-06")) fobhav(date_str) else fobhav1(date_str)
    }, error = function(e) NULL)

    if (is.null(df) || nrow(df) == 0) {
      cat(sprintf("%s -- holiday/no data\n", d))
      return(invisible(NULL))
    }

    names(df) <- toupper(trimws(names(df)))

    aliases <- list(
      SYMBOL=c("FINSYMBOL"), EXPIRY_DT=c("EXPIRYDATE","EXPIRY_DATE"),
      OPTION_TYP=c("OPTIONTYPE"), STRIKE_PR=c("STRIKEPRICE","STRIKE"),
      OPEN=c("OPENPRICE","OPENINGPRICE"), HIGH=c("HIGHPRICE"), LOW=c("LOWPRICE"),
      CLOSE=c("CLOSEPRICE","CLOSINGPRICE"), SETTLE_PR=c("SETTLEMENTPRICE","SETTLEPRICE"),
      OPEN_INT=c("OPENINTEREST"), VOLUME=c("CONTRACTS","NO_OF_CONTRACTS")
    )
    for (std in names(aliases)) {
      if (!(std %in% names(df))) {
        for (alias in aliases[[std]]) {
          if (alias %in% names(df)) { names(df)[names(df)==alias] <- std; break }
        }
      }
    }

    if ("OPTION_TYP" %in% names(df)) df <- df[df$OPTION_TYP %in% c("CE","PE"), ]
    if ("SYMBOL" %in% names(df)) df <- df[df$SYMBOL %in% TARGET_SYMBOLS, ]

    if (is.null(df) || nrow(df) == 0) {
      cat(sprintf("%s -- no target symbols\n", d))
      return(invisible(NULL))
    }

    rows <- list()
    for (j in 1:nrow(df)) {
      row <- df[j, ]
      expiry_val <- parse_date_safe(row[["EXPIRY_DT"]])
      if (is.na(expiry_val)) next
      strike_val <- safe_num(row[["STRIKE_PR"]])
      if (is.na(strike_val)) next
      rows[[length(rows)+1]] <- list(
        date   = as.character(d),
        symbol = trimws(as.character(row[["SYMBOL"]])),
        expiry = expiry_val,
        strike = strike_val,
        type   = trimws(as.character(row[["OPTION_TYP"]])),
        open   = safe_num(row[["OPEN"]]),
        high   = safe_num(row[["HIGH"]]),
        low    = safe_num(row[["LOW"]]),
        close  = safe_num(row[["CLOSE"]]),
        settle = safe_num(row[["SETTLE_PR"]]),
        oi     = safe_int(row[["OPEN_INT"]]),
        volume = safe_int(row[["VOLUME"]])
      )
    }

    if (length(rows) == 0) return(invisible(NULL))

    for (b in seq(1, length(rows), by=200)) {
      batch <- rows[b:min(b+199, length(rows))]
      insert_batch(batch)
    }

    cat(sprintf("%s -- %d rows stored\n", d, length(rows)))

  }, error = function(e) {
    cat(sprintf("%s -- error: %s\n", d, conditionMessage(e)))
  })
}

today     <- Sys.Date()
yesterday <- today - 1

cat("Running daily bhav download...\n")
cat(sprintf("Date: %s\n\n", today))

process_date(yesterday)
process_date(today)

cat("\nDone!\n")
