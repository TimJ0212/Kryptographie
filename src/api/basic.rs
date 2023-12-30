use crate::api::endpoints::math::exponentiation::exponentiation;
use crate::api::endpoints::math::extended_euclid::euclid_endpoint;
use crate::api::endpoints::math::modular_inverse::modular_inverse_endpoint;
use crate::api::endpoints::math::shanks::shanks_endpoint;
use crate::api::endpoints::multiplication::multiplication;
use crate::api::endpoints::rsa::create_key_pair::create_key_pair;
use crate::api::endpoints::rsa::decrypt::decrypt;
use crate::api::endpoints::rsa::encrypt::encrypt;
use crate::api::endpoints::rsa::sign::sign;
use crate::api::endpoints::rsa::verify::verify;
use actix_web::{web, HttpResponse, Responder};
use log::info;
use serde::Serialize;

#[derive(Serialize)]
pub struct Response {
    pub message: String,
}

pub fn config_app(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/health").route("", web::get().to(healthcheck)))
        .service(
            web::scope("/rsa")
                .route("/createKeyPair", web::post().to(create_key_pair))
                .route("/encrypt", web::post().to(encrypt))
                .route("/decrypt", web::post().to(decrypt))
                .route("/sign", web::post().to(sign))
                .route("/verify", web::post().to(verify))
                .route("/multiplication", web::post().to(multiplication)),
        )
        .service(
            web::scope("/math")
                .route("/exponentiation", web::post().to(exponentiation))
                .route("/extended_euclid", web::post().to(euclid_endpoint))
                .route("/shanks", web::post().to(shanks_endpoint))
                .route("/modular_inverse", web::post().to(modular_inverse_endpoint)),
        )
        .default_service(web::route().to(not_found));
}

async fn healthcheck() -> impl Responder {
    info!("Endpunkt /health wurde aufgerufen");
    let response = Response {
        message: "Everything is working fine".to_string(),
    };
    HttpResponse::Ok().json(response)
}

async fn not_found() -> HttpResponse {
    info!("Endpunkt wurde nicht gefunden");
    let response = Response {
        message: "Resource not found".to_string(),
    };
    HttpResponse::NotFound().json(response)
}
