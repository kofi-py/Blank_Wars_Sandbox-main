--
-- PostgreSQL database dump
--

\restrict jeEJcadkPkJHi790Dx70RFChuUHM4vc3rdU8Fcdtg4bcveefaGEToamnaNLiuHl

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: user_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_equipment (id, user_id, equipment_id, is_equipped, equipped_to_character_id, current_level, enhancement_level, custom_stats, acquired_at, acquired_from, purchase_price, created_at, updated_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict jeEJcadkPkJHi790Dx70RFChuUHM4vc3rdU8Fcdtg4bcveefaGEToamnaNLiuHl

