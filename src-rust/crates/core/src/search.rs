use shared::{AppError, Item, SearchParams, ListResponse};
use net::cbg::{CbgClient, SearchOptions};
use data::repositories::item as item_repo;

pub struct SearchService {
    cbg_client: CbgClient,
}

impl SearchService {
    pub fn new() -> Self {
        Self {
            cbg_client: CbgClient::default(),
        }
    }

    pub async fn search(&self, params: SearchParams) -> Result<ListResponse<Item>, AppError> {
        let page = params.page.unwrap_or(1);
        let limit = params.limit.unwrap_or(15);

        let search_opts = SearchOptions {
            keyword: params.q,
            price_min: params.min_price,
            price_max: params.max_price,
            variation_unlock_level: None,
        };

        let resp = self.cbg_client
            .search(params.category, page, limit, search_opts)
            .await?;

        let items: Vec<Item> = resp.items
            .iter()
            .map(|item| {
                let _ = item_repo::upsert(item);
                item.clone()
            })
            .collect();

        Ok(ListResponse {
            total: resp.total,
            page,
            page_size: limit,
            data: items,
        })
    }
}

impl Default for SearchService {
    fn default() -> Self {
        Self::new()
    }
}
