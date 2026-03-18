use leptos::prelude::*;

#[component]
pub fn App() -> impl IntoView {
    let (count, set_count) = create_signal(0);
    
    view! {
        <div>
            <h1>"永劫无间藏宝阁助手"</h1>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Clicked: " {count}
            </button>
        </div>
    }
}
