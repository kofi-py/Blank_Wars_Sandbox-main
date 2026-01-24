--
-- PostgreSQL database dump
--

\restrict rW7w3WkBglWpwxSUc0iJQ5cS6TuAaa0fAyv3NSr4muuPQSgBYQPCeJL3hyYVq9l

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_equipment (
    id text NOT NULL,
    user_id text NOT NULL,
    equipment_id text NOT NULL,
    is_equipped boolean DEFAULT false,
    equipped_to_character_id text,
    current_level integer DEFAULT 1,
    enhancement_level integer DEFAULT 0,
    custom_stats text DEFAULT '{}'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acquired_from text,
    purchase_price integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_equipment OWNER TO postgres;

--
-- Name: user_equipment user_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_pkey PRIMARY KEY (id);


--
-- Name: idx_user_equipment_character_slot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_equipment_character_slot ON public.user_equipment USING btree (equipped_to_character_id, is_equipped) WHERE (is_equipped = true);


--
-- Name: idx_user_equipment_equipment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_equipment_equipment ON public.user_equipment USING btree (equipment_id);


--
-- Name: idx_user_equipment_equipped; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_equipment_equipped ON public.user_equipment USING btree (equipped_to_character_id) WHERE (equipped_to_character_id IS NOT NULL);


--
-- Name: idx_user_equipment_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_equipment_user ON public.user_equipment USING btree (user_id);


--
-- Name: user_equipment user_equipment_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: user_equipment user_equipment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rW7w3WkBglWpwxSUc0iJQ5cS6TuAaa0fAyv3NSr4muuPQSgBYQPCeJL3hyYVq9l

